/**
 * Intelligence API Routes — Market scan and research endpoints.
 *
 * Endpoints:
 *   POST /api/intelligence/scan   — Run market intelligence scan
 *   GET  /api/intelligence/status — Check scan status
 */

import { Router, Request, Response, NextFunction } from 'express';
import { runResearchAgent } from '../agents/index.js';
import { AgentRunModel } from '../db/models/AgentRun.js';
import { BusinessModel } from '../db/models/Business.js';
import { verifyJWT } from '../auth/middleware.js';

export function createIntelligenceRoutes(): Router {
  const router = Router();

  // ─── POST /api/intelligence/scan ────────────────────────────────────────────

  /**
   * Run a market intelligence scan for a business.
   *
   * Fetches live web data via Bright Data tools, identifies opportunities,
   * and saves findings as Opportunity documents.
   *
   * Body:
   *   {
   *     business_id?: string,        // Default: 'demo'
   *     focus?: string               // Optional focus (e.g., "competitors", "market_trends")
   *     competitors?: string[]       // Optional list of competitor names
   *   }
   *
   * Response:
   *   {
   *     agentRunId: string,
   *     business_id: string,
   *     scan_type: 'market_intelligence',
   *     opportunities: [
   *       {
   *         title: string,
   *         description: string,
   *         category: string,
   *         urgency: 'low' | 'medium' | 'high',
   *         impact_score: number,
   *         source: string,
   *         suggested_action: string
   *       }
   *     ],
   *     summary: string,
   *     data_freshness: string,
   *     created_at: ISO8601
   *   }
   *
   * Example:
   *   curl -X POST http://localhost:3001/api/intelligence/scan \
   *     -H "Content-Type: application/json" \
   *     -d '{"business_id":"demo","focus":"market_trends"}'
   */
  router.post('/scan', verifyJWT, async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get business_id from authenticated user or request body
      const user = req.user as any;
      let { business_id, focus = 'general', competitors = [] } = req.body;
      
      if (!business_id && user?.businessId) {
        business_id = user.businessId;
      }
      
      if (!business_id) {
        return res.status(400).json({ error: 'business_id is required' });
      }

      // Fetch business for context
      const business: any = await BusinessModel.findById(business_id).lean();

      if (!business) {
        return res.status(404).json({ error: `Business ${business_id} not found` });
      }

      // Fetch additional business data for rich context
      let businessData: any = {
        ...business,
        leads: [],
        campaigns: [],
        opportunities: []
      };

      try {
        // Import models
        const { LeadModel } = await import('../db/models/Lead.js');
        const { CampaignModel } = await import('../db/models/Campaign.js');
        const { OpportunityModel } = await import('../db/models/Opportunity.js');
        const { UserModel } = await import('../db/models/User.js');

        // Fetch owner info
        const owner = await UserModel.findById(business.owner_id || business.createdBy).select('name email').lean();
        if (owner) {
          businessData.owner = owner;
        }

        // Fetch recent leads
        businessData.leads = await LeadModel.find({ business_id })
          .sort('-createdAt')
          .limit(20)
          .select('name email status score lastContact source')
          .lean();

        // Fetch recent campaigns
        businessData.campaigns = await CampaignModel.find({ business_id })
          .sort('-createdAt')
          .limit(10)
          .select('name status type startDate budget metrics')
          .lean();

        // Fetch past opportunities
        businessData.opportunities = await OpportunityModel.find({ business_id })
          .sort('-createdAt')
          .limit(10)
          .select('title category status urgency impact_score')
          .lean();
      } catch (dataError) {
        console.error('[Intelligence] Failed to load additional business data:', dataError);
      }

      // Build scan task with rich context
      const scanTask = buildScanTask(focus, businessData, competitors);

      console.log(`[Intelligence] Starting scan for ${business_id}: ${focus}`);

      // Create AgentRun document
      const agentRun = await AgentRunModel.create({
        business_id,
        agent_type: 'market_intelligence',
        trigger: 'manual',
        status: 'running',
        input_summary: scanTask,
      });

      try {
        // Run research agent with rich business context
        const result = await runResearchAgent({
          task: scanTask,
          businessContext: businessData as any,
          onStep: (step) => {
            console.log(`[Intelligence] ${step.agent}: ${step.action}`);
          },
        });

        // Update AgentRun with results
        agentRun.status = 'completed';
        agentRun.output_summary = result.summary;
        await agentRun.save();

        res.json({
          agentRunId: agentRun._id.toString(),
          business_id,
          scan_type: 'market_intelligence',
          opportunities: result.findings,
          summary: result.summary,
          data_freshness: result.data_freshness,
          created_at: agentRun.createdAt,
        });
      } catch (error) {
        // Update AgentRun with error
        agentRun.status = 'failed';
        agentRun.error_message = (error as Error).message;
        await agentRun.save();

        throw error;
      }
    } catch (error) {
      next(error);
    }
  });

  // ─── GET /api/intelligence/status ───────────────────────────────────────────

  /**
   * Check the status of a market intelligence scan.
   *
   * Query:
   *   agent_run_id?: string       // Get specific scan status
   *   business_id?: string        // List all scans for business
   *   limit?: number              // Default: 10
   *
   * Response:
   *   {
   *     agentRunId: string,
   *     status: 'running' | 'completed' | 'failed',
   *     created_at: ISO8601,
   *     completed_at: ISO8601,
   *     opportunities_found?: number,
   *     error_message?: string
   *   }
   *   OR
   *   [...]  // Array if business_id provided
   *
   * Example:
   *   curl "http://localhost:3001/api/intelligence/status?agent_run_id=507f1f77bcf86cd799439011"
   */
  router.get('/status', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { agent_run_id, business_id, limit = 10 } = req.query;

      if (agent_run_id) {
        // Fetch specific scan
        const run = await AgentRunModel.findById(agent_run_id).lean();

        if (!run) {
          return res.status(404).json({ error: `AgentRun ${agent_run_id} not found` });
        }

        return res.json({
          agentRunId: run._id?.toString(),
          status: run.status,
          created_at: (run as any).createdAt,
          opportunities_found: run.output_summary ? 1 : 0,
          error_message: run.error_message,
        });
      }

      if (business_id) {
        // List scans for business
        const runs = await AgentRunModel.find({
          business_id: business_id as string,
          agent_type: 'market_intelligence',
        })
          .sort({ createdAt: -1 })
          .limit(Number(limit))
          .lean();

        return res.json(
          runs.map((run: any) => ({
            agentRunId: run._id?.toString(),
            status: run.status,
            created_at: run.createdAt,
            opportunities_found: run.output_summary ? 1 : 0,
          }))
        );
      }

      res.status(400).json({ error: 'Provide agent_run_id or business_id' });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Build a scan task based on focus area.
 */
function buildScanTask(
  focus: string,
  business: any,
  competitors: string[]
): string {
  // Build rich business context
  const ownerInfo = business.owner ? `Owner: ${business.owner.name} (${business.owner.email})` : '';
  const businessInfo = `Business: ${business.name} (${business.type}) in ${business.city || 'Unknown location'}`;
  
  // Leads context
  const leadsInfo = business.leads?.length > 0 
    ? `\n\nCURRENT LEADS (${business.leads.length}):\n${business.leads.slice(0, 10).map((l: any) => 
      `- ${l.name}: ${l.email} (Status: ${l.status}, Score: ${l.score || 'N/A'}${l.lastContact ? ', Last: ' + new Date(l.lastContact).toLocaleDateString() : ''})`
    ).join('\n')}`
    : '\n\nCURRENT LEADS: No leads yet';

  // Campaigns context
  const campaignsInfo = business.campaigns?.length > 0
    ? `\n\nACTIVE CAMPAIGNS (${business.campaigns.length}):\n${business.campaigns.map((c: any) => 
      `- ${c.name}: ${c.status} (${c.type || 'General'})${c.budget ? ', Budget: $' + c.budget : ''}`
    ).join('\n')}`
    : '\n\nACTIVE CAMPAIGNS: No campaigns yet';

  // Past opportunities context
  const opportunitiesInfo = business.opportunities?.length > 0
    ? `\n\nPAST INTELLIGENCE FINDINGS (${business.opportunities.length}):\n${business.opportunities.slice(0, 5).map((o: any) => 
      `- [${o.urgency}] ${o.title} (${o.category}, ${o.impact_score}/10 impact)`
    ).join('\n')}`
    : '\n\nPAST INTELLIGENCE: No previous findings';

  // Competitors
  const competitorInfo = competitors.length > 0
    ? `\n\nCompetitors to research: ${competitors.join(', ')}`
    : '';

  // Build task based on focus
  let focusInstructions = '';
  switch (focus) {
    case 'competitors':
      focusInstructions = 'Focus on competitor analysis: pricing, marketing strategies, and market positioning.';
      break;
    case 'market_trends':
      focusInstructions = 'Focus on current market trends, emerging opportunities, and industry shifts.';
      break;
    case 'leads':
      focusInstructions = 'Focus on identifying new lead opportunities and market segments to target.';
      break;
    case 'pricing':
      focusInstructions = 'Focus on pricing strategies and competitive pricing analysis.';
      break;
    default:
      focusInstructions = 'Conduct comprehensive market intelligence covering opportunities, threats, competitors, and trends.';
  }

  return `You are an expert business intelligence analyst for a ${business.type || 'business'}.

${ownerInfo}
${businessInfo}${leadsInfo}${campaignsInfo}${opportunitiesInfo}${competitorInfo}

TASK: ${focusInstructions}

Provide actionable insights specific to this business, considering their current leads, campaigns, and past findings.
Format opportunities as: title, description, category, urgency (low/medium/high), impact_score (1-10), source, suggested_action.`;
}

export default createIntelligenceRoutes;
