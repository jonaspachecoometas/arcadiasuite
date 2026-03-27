import { Router, type Request, type Response } from "express";
import { db } from "../../db/index";
import { sql } from "drizzle-orm";

// ── Event Bus helper ─────────────────────────────────────────────────────────
async function emitCrmEvent(eventType: string, payload: Record<string, any>) {
  const engineHost = process.env.AUTOMATION_ENGINE_HOST || "localhost";
  const enginePort = process.env.AUTOMATION_ENGINE_PORT || "8005";
  try {
    await fetch(`http://${engineHost}:${enginePort}/xos/trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: eventType, payload }),
    });
  } catch {
    // Non-blocking — automation engine may be offline
  }
}

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

router.use(requireAuth);

// ========== CONTACTS ==========

router.get("/contacts", async (req: Request, res: Response) => {
  try {
    const { type, status, search, limit = 50, offset = 0 } = req.query;
    
    let query = sql`SELECT * FROM xos_contacts WHERE 1=1`;
    
    if (type) query = sql`${query} AND type = ${type}`;
    if (status) query = sql`${query} AND lead_status = ${status}`;
    if (search) query = sql`${query} AND (name ILIKE ${'%' + search + '%'} OR email ILIKE ${'%' + search + '%'} OR company ILIKE ${'%' + search + '%'})`;
    
    query = sql`${query} ORDER BY created_at DESC LIMIT ${parseInt(limit as string)} OFFSET ${parseInt(offset as string)}`;
    
    const result = await db.execute(query);
    res.json(result.rows || result);
  } catch (error) {
    console.error("Error fetching contacts:", error);
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

router.get("/contacts/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    
    const result = await db.execute(sql`SELECT * FROM xos_contacts WHERE id = ${id}`);
    const contact = (result.rows || result)[0];
    
    if (!contact) return res.status(404).json({ error: "Contact not found" });
    
    // Get related activities
    const activities = await db.execute(sql`
      SELECT * FROM xos_activities WHERE contact_id = ${id} ORDER BY created_at DESC LIMIT 10
    `);
    
    // Get related deals
    const deals = await db.execute(sql`
      SELECT d.*, s.name as stage_name FROM xos_deals d
      LEFT JOIN xos_pipeline_stages s ON d.stage_id = s.id
      WHERE d.contact_id = ${id} ORDER BY d.created_at DESC
    `);
    
    // Get related conversations
    const conversations = await db.execute(sql`
      SELECT * FROM xos_conversations WHERE contact_id = ${id} ORDER BY created_at DESC LIMIT 5
    `);
    
    res.json({
      ...contact,
      activities: activities.rows || activities,
      deals: deals.rows || deals,
      conversations: conversations.rows || conversations,
    });
  } catch (error) {
    console.error("Error fetching contact:", error);
    res.status(500).json({ error: "Failed to fetch contact" });
  }
});

router.post("/contacts", async (req: Request, res: Response) => {
  try {
    const { name, email, phone, whatsapp, type, company, position, source, tags, notes } = req.body;
    
    if (!name) return res.status(400).json({ error: "Name is required" });
    
    const result = await db.execute(sql`
      INSERT INTO xos_contacts (name, email, phone, whatsapp, type, company, position, source, tags, notes)
      VALUES (${name}, ${email || null}, ${phone || null}, ${whatsapp || null}, ${type || 'lead'},
              ${company || null}, ${position || null}, ${source || 'manual'}, ${tags || null}, ${notes || null})
      RETURNING *
    `);

    const contact = (result.rows || result)[0] as any;
    // Emit CRM event (non-blocking)
    emitCrmEvent("crm.contact.created", { contact_id: contact.id, name: contact.name, type: contact.type, email: contact.email, source: contact.source });
    res.status(201).json(contact);
  } catch (error) {
    console.error("Error creating contact:", error);
    res.status(500).json({ error: "Failed to create contact" });
  }
});

router.put("/contacts/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    
    const { name, email, phone, whatsapp, type, company, position, lead_status, lead_score, tags, notes, assigned_to } = req.body;
    
    const result = await db.execute(sql`
      UPDATE xos_contacts SET
        name = COALESCE(${name}, name),
        email = COALESCE(${email}, email),
        phone = COALESCE(${phone}, phone),
        whatsapp = COALESCE(${whatsapp}, whatsapp),
        type = COALESCE(${type}, type),
        company = COALESCE(${company}, company),
        position = COALESCE(${position}, position),
        lead_status = COALESCE(${lead_status}, lead_status),
        lead_score = COALESCE(${lead_score ? parseInt(lead_score) : null}, lead_score),
        tags = COALESCE(${tags}, tags),
        notes = COALESCE(${notes}, notes),
        assigned_to = COALESCE(${assigned_to}, assigned_to),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `);
    
    res.json((result.rows || result)[0]);
  } catch (error) {
    console.error("Error updating contact:", error);
    res.status(500).json({ error: "Failed to update contact" });
  }
});

router.delete("/contacts/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    
    await db.execute(sql`DELETE FROM xos_contacts WHERE id = ${id}`);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting contact:", error);
    res.status(500).json({ error: "Failed to delete contact" });
  }
});

// ========== COMPANIES ==========

router.get("/companies", async (req: Request, res: Response) => {
  try {
    const { search, industry, limit = 50 } = req.query;
    
    let query = sql`SELECT * FROM xos_companies WHERE 1=1`;
    if (search) query = sql`${query} AND (name ILIKE ${'%' + search + '%'} OR domain ILIKE ${'%' + search + '%'})`;
    if (industry) query = sql`${query} AND industry = ${industry}`;
    query = sql`${query} ORDER BY created_at DESC LIMIT ${parseInt(limit as string)}`;
    
    const result = await db.execute(query);
    res.json(result.rows || result);
  } catch (error) {
    console.error("Error fetching companies:", error);
    res.status(500).json({ error: "Failed to fetch companies" });
  }
});

router.post("/companies", async (req: Request, res: Response) => {
  try {
    const { name, trade_name, document, domain, industry, size, phone, email, website, address, city, state } = req.body;
    
    if (!name) return res.status(400).json({ error: "Name is required" });
    
    const result = await db.execute(sql`
      INSERT INTO xos_companies (name, trade_name, document, domain, industry, size, phone, email, website, address, city, state)
      VALUES (${name}, ${trade_name || null}, ${document || null}, ${domain || null}, ${industry || null}, 
              ${size || null}, ${phone || null}, ${email || null}, ${website || null}, ${address || null}, ${city || null}, ${state || null})
      RETURNING *
    `);
    
    res.status(201).json((result.rows || result)[0]);
  } catch (error) {
    console.error("Error creating company:", error);
    res.status(500).json({ error: "Failed to create company" });
  }
});

// ========== PIPELINES & DEALS ==========

router.get("/pipelines", async (req: Request, res: Response) => {
  try {
    const pipelines = await db.execute(sql`
      SELECT p.*, 
        (SELECT json_agg(s ORDER BY s.sort_order) FROM xos_pipeline_stages s WHERE s.pipeline_id = p.id) as stages
      FROM xos_pipelines p
      WHERE p.is_active = true
      ORDER BY p.is_default DESC, p.name
    `);
    
    res.json(pipelines.rows || pipelines);
  } catch (error) {
    console.error("Error fetching pipelines:", error);
    res.status(500).json({ error: "Failed to fetch pipelines" });
  }
});

router.get("/deals", async (req: Request, res: Response) => {
  try {
    const { pipeline_id, stage_id, status, assigned_to } = req.query;
    
    let query = sql`
      SELECT d.*, 
        c.name as contact_name, c.email as contact_email, c.avatar_url as contact_avatar,
        co.name as company_name,
        s.name as stage_name, s.color as stage_color
      FROM xos_deals d
      LEFT JOIN xos_contacts c ON d.contact_id = c.id
      LEFT JOIN xos_companies co ON d.company_id = co.id
      LEFT JOIN xos_pipeline_stages s ON d.stage_id = s.id
      WHERE 1=1
    `;
    
    if (pipeline_id) query = sql`${query} AND d.pipeline_id = ${parseInt(pipeline_id as string)}`;
    if (stage_id) query = sql`${query} AND d.stage_id = ${parseInt(stage_id as string)}`;
    if (status) query = sql`${query} AND d.status = ${status}`;
    if (assigned_to) query = sql`${query} AND d.assigned_to = ${assigned_to}`;
    
    query = sql`${query} ORDER BY d.created_at DESC`;
    
    const result = await db.execute(query);
    res.json(result.rows || result);
  } catch (error) {
    console.error("Error fetching deals:", error);
    res.status(500).json({ error: "Failed to fetch deals" });
  }
});

router.post("/deals", async (req: Request, res: Response) => {
  try {
    const { pipeline_id, stage_id, contact_id, company_id, title, value, expected_close_date, assigned_to, notes } = req.body;
    
    if (!title || !pipeline_id || !stage_id) {
      return res.status(400).json({ error: "Title, pipeline_id and stage_id are required" });
    }
    
    const result = await db.execute(sql`
      INSERT INTO xos_deals (pipeline_id, stage_id, contact_id, company_id, title, value, expected_close_date, assigned_to, notes)
      VALUES (${parseInt(pipeline_id)}, ${parseInt(stage_id)}, ${contact_id ? parseInt(contact_id) : null},
              ${company_id ? parseInt(company_id) : null}, ${title}, ${parseFloat(value) || 0},
              ${expected_close_date || null}, ${assigned_to || null}, ${notes || null})
      RETURNING *
    `);

    const deal = (result.rows || result)[0] as any;
    emitCrmEvent("crm.deal.created", { deal_id: deal.id, title: deal.title, value: deal.value, pipeline_id: deal.pipeline_id, stage_id: deal.stage_id, contact_id: deal.contact_id });
    res.status(201).json(deal);
  } catch (error) {
    console.error("Error creating deal:", error);
    res.status(500).json({ error: "Failed to create deal" });
  }
});

router.put("/deals/:id/stage", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    
    const { stage_id } = req.body;
    if (!stage_id) return res.status(400).json({ error: "stage_id is required" });
    
    // Check if stage is won or lost
    const stageResult = await db.execute(sql`SELECT is_won, is_lost FROM xos_pipeline_stages WHERE id = ${parseInt(stage_id)}`);
    const stage = (stageResult.rows || stageResult)[0];
    
    let status = 'open';
    let closedAt = null;
    if (stage?.is_won) {
      status = 'won';
      closedAt = sql`CURRENT_TIMESTAMP`;
    } else if (stage?.is_lost) {
      status = 'lost';
      closedAt = sql`CURRENT_TIMESTAMP`;
    }
    
    const result = await db.execute(sql`
      UPDATE xos_deals SET
        stage_id = ${parseInt(stage_id)},
        status = ${status},
        closed_at = ${closedAt},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `);

    const updated = (result.rows || result)[0] as any;
    const evtType = status === 'won' ? "crm.deal.won" : status === 'lost' ? "crm.deal.lost" : "crm.deal.stage_changed";
    emitCrmEvent(evtType, { deal_id: id, stage_id: parseInt(stage_id), status, title: updated?.title });
    res.json(updated);
  } catch (error) {
    console.error("Error updating deal stage:", error);
    res.status(500).json({ error: "Failed to update deal stage" });
  }
});

router.put("/deals/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    
    const { title, value, notes, expected_close_date } = req.body;
    
    const result = await db.execute(sql`
      UPDATE xos_deals SET 
        title = COALESCE(${title}, title),
        value = COALESCE(${value ? parseFloat(value) : null}, value),
        notes = COALESCE(${notes}, notes),
        expected_close_date = ${expected_close_date || null},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `);
    
    res.json((result.rows || result)[0]);
  } catch (error) {
    console.error("Error updating deal:", error);
    res.status(500).json({ error: "Failed to update deal" });
  }
});

router.delete("/deals/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    
    await db.execute(sql`DELETE FROM xos_deals WHERE id = ${id}`);
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting deal:", error);
    res.status(500).json({ error: "Failed to delete deal" });
  }
});

// ========== CONVERSATIONS & INBOX ==========

router.get("/conversations", async (req: Request, res: Response) => {
  try {
    const { status, channel, assigned_to, queue_id, limit = 50, offset = 0 } = req.query;
    
    let query = sql`
      SELECT cv.*, 
        c.name as contact_name, c.email as contact_email, c.avatar_url as contact_avatar, c.whatsapp as contact_whatsapp,
        q.name as queue_name, q.color as queue_color,
        (SELECT content FROM xos_messages WHERE conversation_id = cv.id ORDER BY created_at DESC LIMIT 1) as last_message
      FROM xos_conversations cv
      LEFT JOIN xos_contacts c ON cv.contact_id = c.id
      LEFT JOIN xos_queues q ON cv.queue_id = q.id
      WHERE 1=1
    `;
    
    if (status) query = sql`${query} AND cv.status = ${status}`;
    if (channel) query = sql`${query} AND cv.channel = ${channel}`;
    if (assigned_to) query = sql`${query} AND cv.assigned_to = ${assigned_to}`;
    if (queue_id) query = sql`${query} AND cv.queue_id = ${parseInt(queue_id as string)}`;
    
    query = sql`${query} ORDER BY cv.updated_at DESC LIMIT ${parseInt(limit as string)} OFFSET ${parseInt(offset as string)}`;
    
    const result = await db.execute(query);
    res.json(result.rows || result);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

router.get("/conversations/:id/messages", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    
    const messages = await db.execute(sql`
      SELECT * FROM xos_messages WHERE conversation_id = ${id} ORDER BY created_at ASC
    `);
    
    res.json(messages.rows || messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// ========== TICKETS ==========

router.get("/tickets", async (req: Request, res: Response) => {
  try {
    const { status, priority, assigned_to, limit = 50, offset = 0 } = req.query;
    
    let query = sql`
      SELECT t.*, 
        c.name as contact_name, c.email as contact_email
      FROM xos_tickets t
      LEFT JOIN xos_contacts c ON t.contact_id = c.id
      WHERE 1=1
    `;
    
    if (status) query = sql`${query} AND t.status = ${status}`;
    if (priority) query = sql`${query} AND t.priority = ${priority}`;
    if (assigned_to) query = sql`${query} AND t.assigned_to = ${assigned_to}`;
    
    query = sql`${query} ORDER BY t.created_at DESC LIMIT ${parseInt(limit as string)} OFFSET ${parseInt(offset as string)}`;
    
    const result = await db.execute(query);
    res.json(result.rows || result);
  } catch (error) {
    console.error("Error fetching tickets:", error);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

router.post("/tickets", async (req: Request, res: Response) => {
  try {
    const { contact_id, subject, description, category, priority } = req.body;
    
    if (!subject) return res.status(400).json({ error: "Subject is required" });
    
    // Generate ticket number
    const ticketNumber = `TK-${Date.now().toString(36).toUpperCase()}`;
    
    const result = await db.execute(sql`
      INSERT INTO xos_tickets (ticket_number, contact_id, subject, description, category, priority)
      VALUES (${ticketNumber}, ${contact_id ? parseInt(contact_id) : null}, ${subject}, ${description || null}, ${category || null}, ${priority || 'normal'})
      RETURNING *
    `);

    const ticket = (result.rows || result)[0] as any;
    emitCrmEvent("crm.ticket.created", { ticket_id: ticket.id, ticket_number: ticketNumber, subject, priority: ticket.priority, contact_id: ticket.contact_id });
    res.status(201).json(ticket);
  } catch (error) {
    console.error("Error creating ticket:", error);
    res.status(500).json({ error: "Failed to create ticket" });
  }
});

// ========== ACTIVITIES ==========

router.get("/activities", async (req: Request, res: Response) => {
  try {
    const { contact_id, deal_id, type, status, limit = 50, offset = 0 } = req.query;
    
    let query = sql`
      SELECT a.*, 
        c.name as contact_name,
        d.title as deal_title
      FROM xos_activities a
      LEFT JOIN xos_contacts c ON a.contact_id = c.id
      LEFT JOIN xos_deals d ON a.deal_id = d.id
      WHERE 1=1
    `;
    
    if (contact_id) query = sql`${query} AND a.contact_id = ${parseInt(contact_id as string)}`;
    if (deal_id) query = sql`${query} AND a.deal_id = ${parseInt(deal_id as string)}`;
    if (type) query = sql`${query} AND a.type = ${type}`;
    if (status) query = sql`${query} AND a.status = ${status}`;
    
    query = sql`${query} ORDER BY a.due_at ASC NULLS LAST, a.created_at DESC LIMIT ${parseInt(limit as string)} OFFSET ${parseInt(offset as string)}`;
    
    const result = await db.execute(query);
    res.json(result.rows || result);
  } catch (error) {
    console.error("Error fetching activities:", error);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
});

router.post("/activities", async (req: Request, res: Response) => {
  try {
    const { type, title, description, due_at, contact_id, company_id, deal_id, assigned_to, priority } = req.body;
    
    if (!type || !title) return res.status(400).json({ error: "Type and title are required" });
    
    const result = await db.execute(sql`
      INSERT INTO xos_activities (type, title, description, due_at, contact_id, company_id, deal_id, assigned_to, priority)
      VALUES (${type}, ${title}, ${description || null}, ${due_at || null}, 
              ${contact_id ? parseInt(contact_id) : null}, ${company_id ? parseInt(company_id) : null},
              ${deal_id ? parseInt(deal_id) : null}, ${assigned_to || null}, ${priority || 'normal'})
      RETURNING *
    `);
    
    res.status(201).json((result.rows || result)[0]);
  } catch (error) {
    console.error("Error creating activity:", error);
    res.status(500).json({ error: "Failed to create activity" });
  }
});

// ========== DASHBOARD STATS ==========

router.get("/stats", async (req: Request, res: Response) => {
  try {
    const stats = await db.execute(sql`
      SELECT 
        (SELECT COUNT(*) FROM xos_contacts) as total_contacts,
        (SELECT COUNT(*) FROM xos_contacts WHERE type = 'lead') as total_leads,
        (SELECT COUNT(*) FROM xos_contacts WHERE type = 'customer') as total_customers,
        (SELECT COUNT(*) FROM xos_companies) as total_companies,
        (SELECT COUNT(*) FROM xos_deals WHERE status = 'open') as open_deals,
        (SELECT COUNT(*) FROM xos_deals WHERE status = 'won') as won_deals,
        (SELECT COALESCE(SUM(value), 0) FROM xos_deals WHERE status = 'open') as pipeline_value,
        (SELECT COALESCE(SUM(value), 0) FROM xos_deals WHERE status = 'won') as won_value,
        (SELECT COUNT(*) FROM xos_conversations WHERE status = 'open') as open_conversations,
        (SELECT COUNT(*) FROM xos_tickets WHERE status NOT IN ('resolved', 'closed')) as open_tickets,
        (SELECT COUNT(*) FROM xos_activities WHERE status = 'pending' AND due_at <= CURRENT_TIMESTAMP) as overdue_activities
    `);
    
    res.json((stats.rows || stats)[0]);
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ========== QUEUES (FILAS) ==========

router.get("/queues", async (req: Request, res: Response) => {
  try {
    const result = await db.execute(sql`
      SELECT q.*, 
        (SELECT COUNT(*) FROM xos_queue_users qu WHERE qu.queue_id = q.id AND qu.is_active = true) as users_count,
        (SELECT COUNT(*) FROM xos_conversations c WHERE c.queue_id = q.id AND c.status = 'open') as open_conversations
      FROM xos_queues q 
      WHERE q.is_active = true 
      ORDER BY q.order_priority
    `);
    res.json(result.rows || result);
  } catch (error) {
    console.error("Error fetching queues:", error);
    res.status(500).json({ error: "Failed to fetch queues" });
  }
});

router.post("/queues", async (req: Request, res: Response) => {
  try {
    const { name, color, greetingMessage, outOfHoursMessage, schedules, orderPriority } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    
    const result = await db.execute(sql`
      INSERT INTO xos_queues (name, color, greeting_message, out_of_hours_message, schedules, order_priority)
      VALUES (${name}, ${color || 'blue'}, ${greetingMessage || null}, ${outOfHoursMessage || null}, 
              ${schedules ? JSON.stringify(schedules) : null}, ${orderPriority || 0})
      RETURNING *
    `);
    res.status(201).json((result.rows || result)[0]);
  } catch (error) {
    console.error("Error creating queue:", error);
    res.status(500).json({ error: "Failed to create queue" });
  }
});

// ========== INTERNAL NOTES (NOTAS INTERNAS) ==========

router.get("/notes", async (req: Request, res: Response) => {
  try {
    const { conversationId, contactId, ticketId } = req.query;
    
    let query = sql`SELECT * FROM xos_internal_notes WHERE 1=1`;
    if (conversationId) query = sql`${query} AND conversation_id = ${parseInt(conversationId as string)}`;
    if (contactId) query = sql`${query} AND contact_id = ${parseInt(contactId as string)}`;
    if (ticketId) query = sql`${query} AND ticket_id = ${parseInt(ticketId as string)}`;
    query = sql`${query} ORDER BY is_pinned DESC, created_at DESC`;
    
    const result = await db.execute(query);
    res.json(result.rows || result);
  } catch (error) {
    console.error("Error fetching notes:", error);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

router.post("/notes", async (req: Request, res: Response) => {
  try {
    const { conversationId, contactId, ticketId, content, userName } = req.body;
    if (!content) return res.status(400).json({ error: "Content is required" });
    
    const result = await db.execute(sql`
      INSERT INTO xos_internal_notes (conversation_id, contact_id, ticket_id, content, user_name)
      VALUES (${conversationId || null}, ${contactId || null}, ${ticketId || null}, ${content}, ${userName || 'Usuário'})
      RETURNING *
    `);
    res.status(201).json((result.rows || result)[0]);
  } catch (error) {
    console.error("Error creating note:", error);
    res.status(500).json({ error: "Failed to create note" });
  }
});

router.delete("/notes/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    await db.execute(sql`DELETE FROM xos_internal_notes WHERE id = ${id}`);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting note:", error);
    res.status(500).json({ error: "Failed to delete note" });
  }
});

// ========== QUICK MESSAGES (MENSAGENS RÁPIDAS) ==========

router.get("/quick-messages", async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    let query = sql`SELECT * FROM xos_quick_messages WHERE 1=1`;
    if (search) query = sql`${query} AND (shortcode ILIKE ${'%' + search + '%'} OR title ILIKE ${'%' + search + '%'} OR content ILIKE ${'%' + search + '%'})`;
    query = sql`${query} ORDER BY usage_count DESC, shortcode`;
    
    const result = await db.execute(query);
    res.json(result.rows || result);
  } catch (error) {
    console.error("Error fetching quick messages:", error);
    res.status(500).json({ error: "Failed to fetch quick messages" });
  }
});

router.post("/quick-messages", async (req: Request, res: Response) => {
  try {
    const { shortcode, title, content, mediaUrl, mediaType, scope } = req.body;
    if (!shortcode || !content) return res.status(400).json({ error: "Shortcode and content required" });
    
    const result = await db.execute(sql`
      INSERT INTO xos_quick_messages (shortcode, title, content, media_url, media_type, scope)
      VALUES (${shortcode}, ${title || null}, ${content}, ${mediaUrl || null}, ${mediaType || null}, ${scope || 'company'})
      RETURNING *
    `);
    res.status(201).json((result.rows || result)[0]);
  } catch (error) {
    console.error("Error creating quick message:", error);
    res.status(500).json({ error: "Failed to create quick message" });
  }
});

router.put("/quick-messages/:id/use", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    
    const result = await db.execute(sql`
      UPDATE xos_quick_messages SET usage_count = usage_count + 1 WHERE id = ${id} RETURNING *
    `);
    res.json((result.rows || result)[0]);
  } catch (error) {
    console.error("Error updating quick message:", error);
    res.status(500).json({ error: "Failed to update quick message" });
  }
});

// ========== CONVERSATION TRANSFER ==========

router.put("/conversations/:id/transfer", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    
    const { queueId, assignedTo } = req.body;
    
    const result = await db.execute(sql`
      UPDATE xos_conversations SET
        queue_id = COALESCE(${queueId ? parseInt(queueId) : null}, queue_id),
        assigned_to = COALESCE(${assignedTo || null}, assigned_to),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `);
    res.json((result.rows || result)[0]);
  } catch (error) {
    console.error("Error transferring conversation:", error);
    res.status(500).json({ error: "Failed to transfer conversation" });
  }
});

// ========== SCHEDULED MESSAGES ==========

router.get("/scheduled-messages", async (req: Request, res: Response) => {
  try {
    const { contactId, status } = req.query;
    let query = sql`SELECT sm.*, c.name as contact_name FROM xos_scheduled_messages sm
      LEFT JOIN xos_contacts c ON sm.contact_id = c.id WHERE 1=1`;
    if (contactId) query = sql`${query} AND sm.contact_id = ${parseInt(contactId as string)}`;
    if (status) query = sql`${query} AND sm.status = ${status}`;
    query = sql`${query} ORDER BY sm.scheduled_at`;
    
    const result = await db.execute(query);
    res.json(result.rows || result);
  } catch (error) {
    console.error("Error fetching scheduled messages:", error);
    res.status(500).json({ error: "Failed to fetch scheduled messages" });
  }
});

router.post("/scheduled-messages", async (req: Request, res: Response) => {
  try {
    const { contactId, conversationId, content, scheduledAt, mediaUrl, mediaType } = req.body;
    if (!content || !scheduledAt) return res.status(400).json({ error: "Content and scheduledAt required" });
    
    const result = await db.execute(sql`
      INSERT INTO xos_scheduled_messages (contact_id, conversation_id, content, scheduled_at, media_url, media_type)
      VALUES (${contactId || null}, ${conversationId || null}, ${content}, ${scheduledAt}, ${mediaUrl || null}, ${mediaType || null})
      RETURNING *
    `);
    res.status(201).json((result.rows || result)[0]);
  } catch (error) {
    console.error("Error creating scheduled message:", error);
    res.status(500).json({ error: "Failed to create scheduled message" });
  }
});

router.delete("/scheduled-messages/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    await db.execute(sql`UPDATE xos_scheduled_messages SET status = 'cancelled' WHERE id = ${id}`);
    res.json({ success: true });
  } catch (error) {
    console.error("Error cancelling scheduled message:", error);
    res.status(500).json({ error: "Failed to cancel scheduled message" });
  }
});

// ========== SUPERVISOR MONITOR ==========

router.get("/supervisor/overview", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;
    const tenantFilter = tenantId ? sql` AND tenant_id = ${parseInt(tenantId as string)}` : sql``;

    const [convStats, ticketStats, agentStats] = await Promise.all([
      db.execute(sql`
        SELECT
          COUNT(*) FILTER (WHERE status = 'open') as open_conversations,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_conversations,
          COUNT(*) FILTER (WHERE status = 'resolved' AND updated_at > NOW() - INTERVAL '24 hours') as resolved_today,
          COUNT(*) FILTER (WHERE assigned_to IS NULL AND status IN ('open','pending')) as unassigned,
          ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(closed_at, NOW()) - created_at))/60)::numeric, 1) as avg_handle_time_minutes
        FROM xos_conversations WHERE 1=1${tenantFilter}
      `),
      db.execute(sql`
        SELECT
          COUNT(*) FILTER (WHERE status = 'open') as open_tickets,
          COUNT(*) FILTER (WHERE status = 'resolved' AND updated_at > NOW() - INTERVAL '24 hours') as resolved_today,
          COUNT(*) FILTER (WHERE priority = 'urgent' AND status = 'open') as urgent_open,
          COUNT(*) FILTER (WHERE sla_due_at < NOW() AND status != 'resolved') as sla_breached
        FROM xos_tickets WHERE 1=1${tenantFilter}
      `),
      db.execute(sql`
        SELECT assigned_to as agent_id, COUNT(*) as active_conversations
        FROM xos_conversations
        WHERE assigned_to IS NOT NULL AND status IN ('open','pending')
        GROUP BY assigned_to ORDER BY active_conversations DESC LIMIT 20
      `),
    ]);

    const conv = ((convStats.rows || convStats)[0] || {}) as any;
    const tick = ((ticketStats.rows || ticketStats)[0] || {}) as any;

    res.json({
      conversations: {
        open: Number(conv.open_conversations || 0),
        pending: Number(conv.pending_conversations || 0),
        resolved_today: Number(conv.resolved_today || 0),
        unassigned: Number(conv.unassigned || 0),
        avg_handle_time_minutes: Number(conv.avg_handle_time_minutes || 0),
      },
      tickets: {
        open: Number(tick.open_tickets || 0),
        resolved_today: Number(tick.resolved_today || 0),
        urgent_open: Number(tick.urgent_open || 0),
        sla_breached: Number(tick.sla_breached || 0),
      },
      agents_active: (agentStats.rows || agentStats),
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching supervisor overview:", error);
    res.status(500).json({ error: "Failed to fetch supervisor overview" });
  }
});

router.get("/supervisor/queues", async (req: Request, res: Response) => {
  try {
    const result = await db.execute(sql`
      SELECT
        q.id, q.name, q.color,
        COUNT(DISTINCT c.id) FILTER (WHERE c.status IN ('open','pending')) as active_conversations,
        COUNT(DISTINCT c.id) FILTER (WHERE c.assigned_to IS NULL AND c.status IN ('open','pending')) as waiting,
        COUNT(DISTINCT qu.user_id) as total_agents,
        ROUND(AVG(
          CASE WHEN ct.first_response_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (ct.first_response_at - ct.queued_at))/60 END
        )::numeric, 1) as avg_first_response_minutes
      FROM xos_queues q
      LEFT JOIN xos_conversations c ON c.queue_id = q.id
      LEFT JOIN xos_queue_users qu ON qu.queue_id = q.id AND qu.is_active = true
      LEFT JOIN xos_conversation_tracking ct ON ct.queue_id = q.id AND ct.queued_at > NOW() - INTERVAL '24 hours'
      WHERE q.is_active = true
      GROUP BY q.id, q.name, q.color
      ORDER BY active_conversations DESC
    `);
    res.json(result.rows || result);
  } catch (error) {
    console.error("Error fetching supervisor queues:", error);
    res.status(500).json({ error: "Failed to fetch queue stats" });
  }
});

router.get("/supervisor/agents", async (req: Request, res: Response) => {
  try {
    const { queueId } = req.query;
    const queueFilter = queueId ? sql` AND qu.queue_id = ${parseInt(queueId as string)}` : sql``;
    const result = await db.execute(sql`
      SELECT
        u.id as agent_id, u.name as agent_name, u.avatar,
        COUNT(DISTINCT c.id) FILTER (WHERE c.status IN ('open','pending')) as active_conversations,
        COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'resolved' AND c.updated_at > NOW() - INTERVAL '24 hours') as resolved_today,
        ROUND(AVG(CASE WHEN c.satisfaction_score IS NOT NULL THEN c.satisfaction_score END)::numeric, 2) as avg_csat,
        ROUND(AVG(CASE WHEN c.closed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (c.closed_at - c.created_at))/60 END)::numeric, 1) as avg_handle_time_minutes,
        array_agg(DISTINCT q.name) FILTER (WHERE q.name IS NOT NULL) as queues
      FROM users u
      INNER JOIN xos_queue_users qu ON qu.user_id = u.id AND qu.is_active = true
      LEFT JOIN xos_queues q ON q.id = qu.queue_id
      LEFT JOIN xos_conversations c ON c.assigned_to = u.id AND c.created_at > NOW() - INTERVAL '24 hours'
      WHERE 1=1${queueFilter}
      GROUP BY u.id, u.name, u.avatar
      ORDER BY active_conversations DESC
    `);
    res.json(result.rows || result);
  } catch (error) {
    console.error("Error fetching supervisor agents:", error);
    res.status(500).json({ error: "Failed to fetch agent stats" });
  }
});

router.get("/supervisor/conversations/live", async (req: Request, res: Response) => {
  try {
    const { queueId, agentId, status = "open" } = req.query;
    let query = sql`
      SELECT c.*, ct2.name as contact_name, ct2.phone as contact_phone,
        q.name as queue_name, q.color as queue_color,
        ROUND(EXTRACT(EPOCH FROM (NOW() - c.created_at))/60, 1) as age_minutes
      FROM xos_conversations c
      LEFT JOIN xos_contacts ct2 ON ct2.id = c.contact_id
      LEFT JOIN xos_queues q ON q.id = c.queue_id
      WHERE c.status = ${status as string}
    `;
    if (queueId) query = sql`${query} AND c.queue_id = ${parseInt(queueId as string)}`;
    if (agentId) query = sql`${query} AND c.assigned_to = ${agentId as string}`;
    query = sql`${query} ORDER BY c.created_at ASC LIMIT 100`;
    const result = await db.execute(query);
    res.json(result.rows || result);
  } catch (error) {
    console.error("Error fetching live conversations:", error);
    res.status(500).json({ error: "Failed to fetch live conversations" });
  }
});


// ========== CSAT ==========

router.post("/conversations/:id/csat", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const { score, comment } = req.body;
    if (!score || score < 1 || score > 5) return res.status(400).json({ error: "Score must be 1-5" });

    await db.execute(sql`UPDATE xos_conversations SET satisfaction_score = ${score}, satisfaction_comment = ${comment || null}, updated_at = NOW() WHERE id = ${id}`);
    await db.execute(sql`UPDATE xos_conversation_tracking SET rating_score = ${score}, rating_comment = ${comment || null}, rated_at = NOW() WHERE conversation_id = ${id}`);
    await db.execute(sql`UPDATE xos_protocols SET satisfaction_score = ${score}, satisfaction_comment = ${comment || null}, updated_at = NOW() WHERE conversation_id = ${id}`);

    emitCrmEvent("crm.csat.received", { conversation_id: id, score, comment });
    res.json({ success: true, score, comment });
  } catch (error) {
    console.error("Error recording CSAT:", error);
    res.status(500).json({ error: "Failed to record CSAT" });
  }
});

router.post("/tickets/:id/csat", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const { score, comment } = req.body;
    if (!score || score < 1 || score > 5) return res.status(400).json({ error: "Score must be 1-5" });

    await db.execute(sql`UPDATE xos_tickets SET satisfaction_score = ${score}, satisfaction_comment = ${comment || null}, updated_at = NOW() WHERE id = ${id}`);
    await db.execute(sql`UPDATE xos_protocols SET satisfaction_score = ${score}, satisfaction_comment = ${comment || null}, updated_at = NOW() WHERE ticket_id = ${id}`);

    emitCrmEvent("crm.csat.received", { ticket_id: id, score, comment });
    res.json({ success: true, score, comment });
  } catch (error) {
    console.error("Error recording ticket CSAT:", error);
    res.status(500).json({ error: "Failed to record CSAT" });
  }
});

router.get("/csat/summary", async (req: Request, res: Response) => {
  try {
    const { period = "30d", queueId } = req.query;
    const intervalMap: Record<string, string> = { "7d": "7 days", "30d": "30 days", "90d": "90 days" };
    const interval = intervalMap[period as string] || "30 days";
    const intSql = sql.raw("INTERVAL '" + interval + "'");
    const qFilter = queueId ? sql` AND c.queue_id = ${parseInt(queueId as string)}` : sql``;

    const result = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE c.satisfaction_score IS NOT NULL) as total_responses,
        ROUND(AVG(c.satisfaction_score)::numeric, 2) as avg_score,
        COUNT(*) FILTER (WHERE c.satisfaction_score = 5) as score_5,
        COUNT(*) FILTER (WHERE c.satisfaction_score = 4) as score_4,
        COUNT(*) FILTER (WHERE c.satisfaction_score = 3) as score_3,
        COUNT(*) FILTER (WHERE c.satisfaction_score <= 2) as score_1_2,
        ROUND(100.0 * COUNT(*) FILTER (WHERE c.satisfaction_score >= 4) /
          NULLIF(COUNT(*) FILTER (WHERE c.satisfaction_score IS NOT NULL), 0), 1) as satisfaction_rate_pct
      FROM xos_conversations c
      WHERE c.updated_at > NOW() - ${intSql}${qFilter}
    `);

    const row = ((result.rows || result)[0] || {}) as any;
    res.json({
      period,
      total_responses: Number(row.total_responses || 0),
      avg_score: Number(row.avg_score || 0),
      satisfaction_rate_pct: Number(row.satisfaction_rate_pct || 0),
      distribution: { 5: Number(row.score_5 || 0), 4: Number(row.score_4 || 0), 3: Number(row.score_3 || 0), "1-2": Number(row.score_1_2 || 0) },
    });
  } catch (error) {
    console.error("Error fetching CSAT summary:", error);
    res.status(500).json({ error: "Failed to fetch CSAT summary" });
  }
});


// ========== PROTOCOLOS ==========

router.get("/protocols", async (req: Request, res: Response) => {
  try {
    const { status, contactId, search, limit = 50, offset = 0 } = req.query;
    let query = sql`
      SELECT p.*, ct.name as contact_name, q.name as queue_name
      FROM xos_protocols p
      LEFT JOIN xos_contacts ct ON ct.id = p.contact_id
      LEFT JOIN xos_queues q ON q.id = p.queue_id WHERE 1=1
    `;
    if (status) query = sql`${query} AND p.status = ${status}`;
    if (contactId) query = sql`${query} AND p.contact_id = ${parseInt(contactId as string)}`;
    if (search) query = sql`${query} AND (p.protocol_number ILIKE ${'%' + search + '%'} OR p.subject ILIKE ${'%' + search + '%'})`;
    query = sql`${query} ORDER BY p.created_at DESC LIMIT ${parseInt(limit as string)} OFFSET ${parseInt(offset as string)}`;
    const result = await db.execute(query);
    res.json(result.rows || result);
  } catch (error) {
    console.error("Error fetching protocols:", error);
    res.status(500).json({ error: "Failed to fetch protocols" });
  }
});

router.post("/protocols", async (req: Request, res: Response) => {
  try {
    const { conversationId, ticketId, contactId, queueId, subject, slaMinutes } = req.body;
    const today = new Date();
    const datePart = today.toISOString().slice(0, 10).replace(/-/g, "");
    const seqResult = await db.execute(sql`SELECT COUNT(*) as cnt FROM xos_protocols WHERE created_at::date = CURRENT_DATE`);
    const seq = Number(((seqResult.rows || seqResult)[0] as any)?.cnt || 0) + 1;
    const protocolNumber = `${datePart}-${String(seq).padStart(6, "0")}`;
    const slaDeadline = slaMinutes ? new Date(Date.now() + slaMinutes * 60000).toISOString() : null;
    const result = await db.execute(sql`
      INSERT INTO xos_protocols (protocol_number, conversation_id, ticket_id, contact_id, queue_id, subject, sla_deadline)
      VALUES (${protocolNumber}, ${conversationId || null}, ${ticketId || null}, ${contactId || null}, ${queueId || null}, ${subject || null}, ${slaDeadline})
      RETURNING *
    `);
    const protocol = (result.rows || result)[0] as any;
    emitCrmEvent("crm.protocol.created", { protocol_id: protocol.id, protocol_number: protocolNumber, contact_id: contactId });
    res.status(201).json(protocol);
  } catch (error) {
    console.error("Error creating protocol:", error);
    res.status(500).json({ error: "Failed to create protocol" });
  }
});

router.patch("/protocols/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const { status, assignedTo } = req.body;
    const result = await db.execute(sql`
      UPDATE xos_protocols SET
        status = COALESCE(${status || null}, status),
        assigned_to = COALESCE(${assignedTo || null}, assigned_to),
        resolved_at = CASE WHEN ${status || null} = 'resolved' THEN NOW() ELSE resolved_at END,
        updated_at = NOW()
      WHERE id = ${id} RETURNING *
    `);
    res.json((result.rows || result)[0]);
  } catch (error) {
    console.error("Error updating protocol:", error);
    res.status(500).json({ error: "Failed to update protocol" });
  }
});

router.post("/conversations/:id/protocol", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const existing = await db.execute(sql`SELECT id, protocol_number FROM xos_protocols WHERE conversation_id = ${id}`);
    if ((existing.rows || existing).length > 0) return res.json((existing.rows || existing)[0]);

    const convResult = await db.execute(sql`SELECT * FROM xos_conversations WHERE id = ${id}`);
    const conv = (convResult.rows || convResult)[0] as any;
    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    let slaMinutes: number | null = null;
    if (conv.queue_id) {
      const slaResult = await db.execute(sql`SELECT resolution_minutes FROM xos_sla_policies WHERE queue_id = ${conv.queue_id} AND is_active = true LIMIT 1`);
      const sla = (slaResult.rows || slaResult)[0] as any;
      if (sla) slaMinutes = sla.resolution_minutes;
    }

    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const seqResult = await db.execute(sql`SELECT COUNT(*) as cnt FROM xos_protocols WHERE created_at::date = CURRENT_DATE`);
    const seq = Number(((seqResult.rows || seqResult)[0] as any)?.cnt || 0) + 1;
    const protocolNumber = `${datePart}-${String(seq).padStart(6, "0")}`;
    const slaDeadline = slaMinutes ? new Date(Date.now() + slaMinutes * 60000).toISOString() : null;

    const result = await db.execute(sql`
      INSERT INTO xos_protocols (protocol_number, conversation_id, contact_id, queue_id, sla_deadline)
      VALUES (${protocolNumber}, ${id}, ${conv.contact_id || null}, ${conv.queue_id || null}, ${slaDeadline})
      RETURNING *
    `);
    res.status(201).json((result.rows || result)[0]);
  } catch (error) {
    console.error("Error creating protocol for conversation:", error);
    res.status(500).json({ error: "Failed to create protocol" });
  }
});


// ========== BUSINESS HOURS ==========

router.get("/queues/:id/business-hours", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const result = await db.execute(sql`SELECT id, name, schedules, out_of_hours_message FROM xos_queues WHERE id = ${id}`);
    const queue = (result.rows || result)[0] as any;
    if (!queue) return res.status(404).json({ error: "Queue not found" });
    res.json({ queue_id: id, queue_name: queue.name, schedules: queue.schedules || [], out_of_hours_message: queue.out_of_hours_message });
  } catch (error) {
    console.error("Error fetching business hours:", error);
    res.status(500).json({ error: "Failed to fetch business hours" });
  }
});

router.put("/queues/:id/business-hours", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const { schedules, outOfHoursMessage } = req.body;
    const result = await db.execute(sql`
      UPDATE xos_queues SET
        schedules = ${JSON.stringify(schedules || [])},
        out_of_hours_message = COALESCE(${outOfHoursMessage || null}, out_of_hours_message),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, name, schedules, out_of_hours_message
    `);
    res.json((result.rows || result)[0]);
  } catch (error) {
    console.error("Error updating business hours:", error);
    res.status(500).json({ error: "Failed to update business hours" });
  }
});

router.get("/queues/:id/is-open", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const result = await db.execute(sql`SELECT schedules, out_of_hours_message FROM xos_queues WHERE id = ${id}`);
    const queue = (result.rows || result)[0] as any;
    if (!queue) return res.status(404).json({ error: "Queue not found" });
    const schedules: Array<{ dayOfWeek: number; startTime: string; endTime: string }> = queue.schedules || [];
    if (!schedules.length) return res.json({ is_open: true, reason: "no_schedule_configured" });
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const todaySchedule = schedules.find(s => s.dayOfWeek === dayOfWeek);
    const isOpen = todaySchedule ? currentTime >= todaySchedule.startTime && currentTime <= todaySchedule.endTime : false;
    res.json({ is_open: isOpen, current_time: currentTime, day_of_week: dayOfWeek, schedule: todaySchedule || null, out_of_hours_message: isOpen ? null : queue.out_of_hours_message });
  } catch (error) {
    console.error("Error checking business hours:", error);
    res.status(500).json({ error: "Failed to check business hours" });
  }
});


// ========== SLA POLICIES ==========

router.get("/sla-policies", async (req: Request, res: Response) => {
  try {
    const { queueId } = req.query;
    let query = sql`SELECT sp.*, q.name as queue_name FROM xos_sla_policies sp LEFT JOIN xos_queues q ON q.id = sp.queue_id WHERE sp.is_active = true`;
    if (queueId) query = sql`${query} AND sp.queue_id = ${parseInt(queueId as string)}`;
    query = sql`${query} ORDER BY sp.priority`;
    const result = await db.execute(query);
    res.json(result.rows || result);
  } catch (error) {
    console.error("Error fetching SLA policies:", error);
    res.status(500).json({ error: "Failed to fetch SLA policies" });
  }
});

router.post("/sla-policies", async (req: Request, res: Response) => {
  try {
    const { name, queueId, priority, firstResponseMinutes, resolutionMinutes, notifyOnBreach } = req.body;
    if (!name) return res.status(400).json({ error: "name required" });
    const result = await db.execute(sql`
      INSERT INTO xos_sla_policies (name, queue_id, priority, first_response_minutes, resolution_minutes, notify_on_breach)
      VALUES (${name}, ${queueId || null}, ${priority || 'normal'}, ${firstResponseMinutes || 60}, ${resolutionMinutes || 480}, ${notifyOnBreach !== false})
      RETURNING *
    `);
    res.status(201).json((result.rows || result)[0]);
  } catch (error) {
    console.error("Error creating SLA policy:", error);
    res.status(500).json({ error: "Failed to create SLA policy" });
  }
});

router.patch("/sla-policies/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const { name, priority, firstResponseMinutes, resolutionMinutes, notifyOnBreach, isActive } = req.body;
    const result = await db.execute(sql`
      UPDATE xos_sla_policies SET
        name = COALESCE(${name || null}, name),
        priority = COALESCE(${priority || null}, priority),
        first_response_minutes = COALESCE(${firstResponseMinutes ?? null}, first_response_minutes),
        resolution_minutes = COALESCE(${resolutionMinutes ?? null}, resolution_minutes),
        notify_on_breach = COALESCE(${notifyOnBreach ?? null}, notify_on_breach),
        is_active = COALESCE(${isActive ?? null}, is_active),
        updated_at = NOW()
      WHERE id = ${id} RETURNING *
    `);
    res.json((result.rows || result)[0]);
  } catch (error) {
    console.error("Error updating SLA policy:", error);
    res.status(500).json({ error: "Failed to update SLA policy" });
  }
});

router.post("/sla-policies/check-breaches", async (req: Request, res: Response) => {
  try {
    const ticketBreaches = await db.execute(sql`
      UPDATE xos_tickets SET updated_at = updated_at
      WHERE sla_due_at < NOW() AND status NOT IN ('resolved', 'closed')
      RETURNING id, ticket_number, priority, contact_id
    `);
    const protocolBreaches = await db.execute(sql`
      UPDATE xos_protocols SET sla_breach = true, updated_at = NOW()
      WHERE sla_deadline < NOW() AND sla_breach = false AND status != 'resolved'
      RETURNING id, protocol_number, contact_id
    `);
    const breachedTickets = (ticketBreaches.rows || ticketBreaches) as any[];
    const breachedProtocols = (protocolBreaches.rows || protocolBreaches) as any[];
    for (const t of breachedTickets) emitCrmEvent("crm.sla.breached", { type: "ticket", ticket_id: t.id, ticket_number: t.ticket_number, priority: t.priority });
    for (const p of breachedProtocols) emitCrmEvent("crm.sla.breached", { type: "protocol", protocol_id: p.id, protocol_number: p.protocol_number });
    res.json({ success: true, breached_tickets: breachedTickets.length, breached_protocols: breachedProtocols.length });
  } catch (error) {
    console.error("Error checking SLA breaches:", error);
    res.status(500).json({ error: "Failed to check SLA breaches" });
  }
});


// ========== REPORTS / ANALYTICS ==========

router.get("/reports/overview", async (req: Request, res: Response) => {
  try {
    const { period = "30d" } = req.query;
    const intervalMap: Record<string, string> = { "7d": "7 days", "30d": "30 days", "90d": "90 days", "1y": "1 year" };
    const interval = intervalMap[period as string] || "30 days";
    const intSql = sql.raw("INTERVAL '" + interval + "'");

    const [convReport, ticketReport, contactReport, dealReport] = await Promise.all([
      db.execute(sql`
        SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
          COUNT(*) FILTER (WHERE status = 'open') as open,
          ROUND(AVG(satisfaction_score)::numeric, 2) as avg_csat,
          ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(closed_at, NOW()) - created_at))/60)::numeric, 1) as avg_handle_minutes,
          COUNT(DISTINCT channel) as channels_used
        FROM xos_conversations WHERE created_at > NOW() - ${intSql}
      `),
      db.execute(sql`
        SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
          COUNT(*) FILTER (WHERE status = 'open') as open,
          COUNT(*) FILTER (WHERE sla_due_at < NOW() AND status != 'resolved') as sla_breaches,
          ROUND(AVG(satisfaction_score)::numeric, 2) as avg_csat
        FROM xos_tickets WHERE created_at > NOW() - ${intSql}
      `),
      db.execute(sql`
        SELECT COUNT(*) as total_contacts, COUNT(*) FILTER (WHERE type = 'lead') as leads,
          COUNT(*) FILTER (WHERE type = 'customer') as customers,
          COUNT(*) FILTER (WHERE created_at > NOW() - ${intSql}) as new_in_period
        FROM xos_contacts
      `),
      db.execute(sql`
        SELECT COUNT(*) as total_deals, COUNT(*) FILTER (WHERE status = 'won') as won,
          COUNT(*) FILTER (WHERE status = 'lost') as lost,
          COALESCE(SUM(value) FILTER (WHERE status = 'won'), 0) as won_value,
          ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'won') /
            NULLIF(COUNT(*) FILTER (WHERE status IN ('won','lost')), 0), 1) as win_rate_pct
        FROM xos_deals WHERE created_at > NOW() - ${intSql}
      `),
    ]);

    const conv = ((convReport.rows || convReport)[0] || {}) as any;
    const tick = ((ticketReport.rows || ticketReport)[0] || {}) as any;
    const cont = ((contactReport.rows || contactReport)[0] || {}) as any;
    const deal = ((dealReport.rows || dealReport)[0] || {}) as any;

    res.json({
      period,
      conversations: {
        total: Number(conv.total || 0), resolved: Number(conv.resolved || 0), open: Number(conv.open || 0),
        avg_csat: Number(conv.avg_csat || 0), avg_handle_minutes: Number(conv.avg_handle_minutes || 0), channels_used: Number(conv.channels_used || 0),
      },
      tickets: {
        total: Number(tick.total || 0), resolved: Number(tick.resolved || 0), open: Number(tick.open || 0),
        sla_breaches: Number(tick.sla_breaches || 0), avg_csat: Number(tick.avg_csat || 0),
      },
      contacts: {
        total: Number(cont.total_contacts || 0), leads: Number(cont.leads || 0), customers: Number(cont.customers || 0), new_in_period: Number(cont.new_in_period || 0),
      },
      deals: {
        total: Number(deal.total_deals || 0), won: Number(deal.won || 0), lost: Number(deal.lost || 0),
        won_value: Number(deal.won_value || 0), win_rate_pct: Number(deal.win_rate_pct || 0),
      },
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching reports overview:", error);
    res.status(500).json({ error: "Failed to fetch overview report" });
  }
});

router.get("/reports/agents", async (req: Request, res: Response) => {
  try {
    const { period = "30d", queueId } = req.query;
    const intervalMap: Record<string, string> = { "7d": "7 days", "30d": "30 days", "90d": "90 days" };
    const interval = intervalMap[period as string] || "30 days";
    const intSql = sql.raw("INTERVAL '" + interval + "'");
    const qFilter = queueId ? sql` AND qu.queue_id = ${parseInt(queueId as string)}` : sql``;

    const result = await db.execute(sql`
      SELECT
        u.id as agent_id, u.name as agent_name,
        COUNT(DISTINCT c.id) as conversations_handled,
        COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'resolved') as resolved,
        ROUND(AVG(c.satisfaction_score)::numeric, 2) as avg_csat,
        ROUND(AVG(CASE WHEN c.closed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (c.closed_at - c.created_at))/60 END)::numeric, 1) as avg_handle_minutes,
        COUNT(DISTINCT t.id) as tickets_handled,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'resolved') as tickets_resolved
      FROM users u
      INNER JOIN xos_queue_users qu ON qu.user_id = u.id AND qu.is_active = true
      LEFT JOIN xos_conversations c ON c.assigned_to = u.id AND c.created_at > NOW() - ${intSql}
      LEFT JOIN xos_tickets t ON t.assigned_to = u.id AND t.created_at > NOW() - ${intSql}
      WHERE 1=1${qFilter}
      GROUP BY u.id, u.name
      ORDER BY conversations_handled DESC
    `);
    res.json(result.rows || result);
  } catch (error) {
    console.error("Error fetching agent report:", error);
    res.status(500).json({ error: "Failed to fetch agent report" });
  }
});

router.get("/reports/sla", async (req: Request, res: Response) => {
  try {
    const { period = "30d" } = req.query;
    const intervalMap: Record<string, string> = { "7d": "7 days", "30d": "30 days", "90d": "90 days" };
    const interval = intervalMap[period as string] || "30 days";
    const intSql = sql.raw("INTERVAL '" + interval + "'");

    const [protResult, tickResult] = await Promise.all([
      db.execute(sql`
        SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE sla_breach = true) as breached,
          COUNT(*) FILTER (WHERE sla_breach = false AND status = 'resolved') as compliant,
          ROUND(100.0 * COUNT(*) FILTER (WHERE sla_breach = false AND status = 'resolved') /
            NULLIF(COUNT(*) FILTER (WHERE status = 'resolved'), 0), 1) as compliance_rate_pct
        FROM xos_protocols WHERE created_at > NOW() - ${intSql}
      `),
      db.execute(sql`
        SELECT priority, COUNT(*) as total,
          COUNT(*) FILTER (WHERE sla_due_at < NOW() AND status != 'resolved') as breached,
          ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at, NOW()) - created_at))/60)::numeric, 1) as avg_resolution_minutes
        FROM xos_tickets WHERE created_at > NOW() - ${intSql}
        GROUP BY priority ORDER BY priority
      `),
    ]);

    const prot = ((protResult.rows || protResult)[0] || {}) as any;
    res.json({
      period,
      protocols: {
        total: Number(prot.total || 0), breached: Number(prot.breached || 0),
        compliant: Number(prot.compliant || 0), compliance_rate_pct: Number(prot.compliance_rate_pct || 0),
      },
      tickets_by_priority: (tickResult.rows || tickResult),
    });
  } catch (error) {
    console.error("Error fetching SLA report:", error);
    res.status(500).json({ error: "Failed to fetch SLA report" });
  }
});


// ========== XOS AUTOMATIONS ENGINE ==========

router.get("/automations", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;
    let query = sql`SELECT * FROM xos_automations WHERE 1=1`;
    if (tenantId) query = sql`${query} AND tenant_id = ${parseInt(tenantId as string)}`;
    query = sql`${query} ORDER BY created_at DESC`;
    const result = await db.execute(query);
    res.json(result.rows || result);
  } catch (error) {
    console.error("Error fetching xos automations:", error);
    res.status(500).json({ error: "Failed to fetch automations" });
  }
});

router.post("/automations", async (req: Request, res: Response) => {
  try {
    const { tenantId, name, description, triggerType, triggerConfig, actions, conditions } = req.body;
    const user = (req as any).user;
    if (!name || !triggerType) return res.status(400).json({ error: "name and triggerType required" });

    const result = await db.execute(sql`
      INSERT INTO xos_automations (tenant_id, name, description, trigger_type, trigger_config, actions, conditions, created_by)
      VALUES (${tenantId || null}, ${name}, ${description || null}, ${triggerType},
              ${triggerConfig ? JSON.stringify(triggerConfig) : null},
              ${actions ? JSON.stringify(actions) : '[]'},
              ${conditions ? JSON.stringify(conditions) : '[]'},
              ${user?.id || null})
      RETURNING *
    `);
    res.status(201).json((result.rows || result)[0]);
  } catch (error) {
    console.error("Error creating xos automation:", error);
    res.status(500).json({ error: "Failed to create automation" });
  }
});

router.patch("/automations/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const { name, description, triggerType, triggerConfig, actions, conditions, isActive } = req.body;

    const result = await db.execute(sql`
      UPDATE xos_automations SET
        name = COALESCE(${name || null}, name),
        description = COALESCE(${description || null}, description),
        trigger_type = COALESCE(${triggerType || null}, trigger_type),
        trigger_config = COALESCE(${triggerConfig ? JSON.stringify(triggerConfig) : null}, trigger_config),
        actions = COALESCE(${actions ? JSON.stringify(actions) : null}, actions),
        conditions = COALESCE(${conditions ? JSON.stringify(conditions) : null}, conditions),
        is_active = COALESCE(${isActive !== undefined ? isActive : null}, is_active),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `);
    res.json((result.rows || result)[0]);
  } catch (error) {
    console.error("Error updating xos automation:", error);
    res.status(500).json({ error: "Failed to update automation" });
  }
});

router.delete("/automations/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    await db.execute(sql`DELETE FROM xos_automations WHERE id = ${id}`);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting xos automation:", error);
    res.status(500).json({ error: "Failed to delete automation" });
  }
});

// Execute a single XOS automation immediately
router.post("/automations/:id/execute", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const user = (req as any).user;

    const result = await db.execute(sql`SELECT * FROM xos_automations WHERE id = ${id}`);
    const automation = (result.rows || result)[0] as any;
    if (!automation) return res.status(404).json({ error: "Automation not found" });

    const execResult = await executeXosAutomation(automation, req.body?.triggerData || {}, user?.id);
    res.json(execResult);
  } catch (error) {
    console.error("Error executing xos automation:", error);
    res.status(500).json({ error: "Failed to execute automation" });
  }
});

// Internal webhook: called by the automation engine when a CRM event fires
router.post("/automations/webhook/crm-event", async (req: Request, res: Response) => {
  try {
    const { event_type, payload, tenant_id } = req.body;
    if (!event_type) return res.status(400).json({ error: "event_type required" });

    const fired = await fireCrmAutomations(event_type, payload || {}, tenant_id);
    res.json({ success: true, automations_fired: fired });
  } catch (error) {
    console.error("Error processing CRM event webhook:", error);
    res.status(500).json({ error: "Failed to process CRM event" });
  }
});

// ── XOS Automation Executor ─────────────────────────────────────────────────

async function evaluateConditions(conditions: any[], triggerData: Record<string, any>): Promise<boolean> {
  if (!conditions || conditions.length === 0) return true;
  for (const cond of conditions) {
    const actual = triggerData[cond.field];
    const expected = cond.value;
    let passes = false;
    switch (cond.operator) {
      case "==": passes = actual == expected; break;
      case "!=": passes = actual != expected; break;
      case ">": passes = Number(actual) > Number(expected); break;
      case "<": passes = Number(actual) < Number(expected); break;
      case ">=": passes = Number(actual) >= Number(expected); break;
      case "<=": passes = Number(actual) <= Number(expected); break;
      case "contains": passes = String(actual).includes(String(expected)); break;
      case "exists": passes = actual !== null && actual !== undefined; break;
      default: passes = actual == expected;
    }
    if (!passes) return false;
  }
  return true;
}

async function executeXosAction(action: { type: string; config: any }, triggerData: Record<string, any>, userId?: string): Promise<string> {
  const config = action.config || {};
  const interpolate = (s: string) => s?.replace(/\{\{(\w+)\}\}/g, (_: string, k: string) => String(triggerData[k] ?? ''));

  switch (action.type) {
    case "send_email": {
      const to = interpolate(config.to || '');
      const subject = interpolate(config.subject || 'Notificação Arcádia');
      const body = interpolate(config.body || '');
      // Route through automation engine event bus
      const engineHost = process.env.AUTOMATION_ENGINE_HOST || "localhost";
      const enginePort = process.env.AUTOMATION_ENGINE_PORT || "8005";
      await fetch(`http://${engineHost}:${enginePort}/events/emit?event_type=system.send_email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, body }),
      }).catch(() => {});
      return `Email enfileirado para ${to}`;
    }

    case "send_whatsapp": {
      const to = interpolate(config.to || '');
      const message = interpolate(config.message || '');
      const engineHost = process.env.AUTOMATION_ENGINE_HOST || "localhost";
      const enginePort = process.env.AUTOMATION_ENGINE_PORT || "8005";
      await fetch(`http://${engineHost}:${enginePort}/events/emit?event_type=system.send_whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, message, channel_id: config.channel_id }),
      }).catch(() => {});
      return `WhatsApp enfileirado para ${to}`;
    }

    case "create_task": {
      const title = interpolate(config.title || 'Tarefa automática');
      await db.execute(sql`
        INSERT INTO xos_activities (contact_id, type, title, description, assigned_to, status)
        VALUES (${triggerData.contact_id || null}, 'task', ${title},
                ${interpolate(config.description || '')},
                ${config.assigned_to || null}, 'pending')
      `);
      return `Tarefa criada: ${title}`;
    }

    case "assign_agent": {
      const convId = triggerData.conversation_id || config.conversation_id;
      const agentId = config.agent_id;
      if (convId && agentId) {
        await db.execute(sql`UPDATE xos_conversations SET assigned_to = ${agentId}, updated_at = NOW() WHERE id = ${convId}`);
        return `Agente #${agentId} atribuído à conversa #${convId}`;
      }
      return "assign_agent: conversation_id ou agent_id ausente";
    }

    case "update_field": {
      const table = config.table || 'xos_contacts';
      const recordId = triggerData[config.id_field || 'contact_id'] || config.record_id;
      const field = config.field;
      const value = interpolate(config.value || '');
      if (recordId && field) {
        await db.execute(sql`UPDATE ${sql.raw(table)} SET ${sql.raw(field)} = ${value}, updated_at = NOW() WHERE id = ${recordId}`);
        return `Campo ${field} atualizado em ${table}#${recordId}`;
      }
      return "update_field: dados insuficientes";
    }

    case "move_deal_stage": {
      const dealId = triggerData.deal_id || config.deal_id;
      const stageId = config.stage_id;
      if (dealId && stageId) {
        await db.execute(sql`UPDATE xos_deals SET stage_id = ${stageId}, updated_at = NOW() WHERE id = ${dealId}`);
        emitCrmEvent("crm.deal.stage_changed", { deal_id: dealId, stage_id: stageId, triggered_by: "automation" });
        return `Deal #${dealId} movido para estágio #${stageId}`;
      }
      return "move_deal_stage: deal_id ou stage_id ausente";
    }

    case "notify_team": {
      const message = interpolate(config.message || 'Evento de automação disparado');
      // Emit notification event
      const engineHost = process.env.AUTOMATION_ENGINE_HOST || "localhost";
      const enginePort = process.env.AUTOMATION_ENGINE_PORT || "8005";
      await fetch(`http://${engineHost}:${enginePort}/events/emit?event_type=system.notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, channel: config.channel || "system", title: config.title || "Automação" }),
      }).catch(() => {});
      return `Notificação enviada: ${message.substring(0, 80)}`;
    }

    case "webhook": {
      const url = config.url;
      if (!url) return "webhook: URL não configurada";
      try {
        const resp = await fetch(url, {
          method: config.method || "POST",
          headers: { "Content-Type": "application/json", ...(config.headers || {}) },
          body: JSON.stringify({ trigger_data: triggerData, config }),
        });
        return `Webhook ${url} → ${resp.status}`;
      } catch (e: any) {
        return `Webhook falhou: ${e.message}`;
      }
    }

    case "agent_task": {
      const prompt = interpolate(config.prompt || 'Execute a automation task');
      if (userId) {
        const { automationService } = await import("../automations/service");
        // Create a temporary automation with agent_task action
        const tempResult = await fetch(
          `http://localhost:${process.env.PORT || 5000}/api/automations`,
          { method: "GET", headers: { "Content-Type": "application/json" } }
        ).catch(() => null);
        // Emit manus task via event bus
        const engineHost = process.env.AUTOMATION_ENGINE_HOST || "localhost";
        const enginePort = process.env.AUTOMATION_ENGINE_PORT || "8005";
        await fetch(`http://${engineHost}:${enginePort}/events/emit?event_type=system.manus_task`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, user_id: userId }),
        }).catch(() => {});
      }
      return `Tarefa do agente IA enfileirada: ${prompt.substring(0, 100)}`;
    }

    default:
      return `Ação desconhecida: ${action.type}`;
  }
}

async function executeXosAutomation(automation: any, triggerData: Record<string, any>, userId?: string) {
  const actions = typeof automation.actions === 'string' ? JSON.parse(automation.actions) : (automation.actions || []);
  const conditions = typeof automation.conditions === 'string' ? JSON.parse(automation.conditions) : (automation.conditions || []);

  const conditionsMet = await evaluateConditions(conditions, triggerData);
  if (!conditionsMet) {
    return { executed: false, reason: "conditions_not_met", automation_id: automation.id };
  }

  const results: string[] = [];
  for (const action of actions) {
    try {
      const result = await executeXosAction(action, triggerData, userId);
      results.push(`✓ ${action.type}: ${result}`);
    } catch (e: any) {
      results.push(`✗ ${action.type}: ${e.message}`);
    }
  }

  // Update execution stats
  await db.execute(sql`
    UPDATE xos_automations
    SET execution_count = execution_count + 1, last_executed_at = NOW()
    WHERE id = ${automation.id}
  `).catch(() => {});

  return { executed: true, automation_id: automation.id, results };
}

export async function fireCrmAutomations(eventType: string, payload: Record<string, any>, tenantId?: number) {
  try {
    let query = sql`SELECT * FROM xos_automations WHERE is_active = true AND trigger_type = ${eventType}`;
    if (tenantId) query = sql`${query} AND (tenant_id = ${tenantId} OR tenant_id IS NULL)`;

    const result = await db.execute(query);
    const automations = (result.rows || result) as any[];

    let fired = 0;
    for (const automation of automations) {
      await executeXosAutomation(automation, payload).catch(() => {});
      fired++;
    }
    return fired;
  } catch {
    return 0;
  }
}

// ─── Campaign Segmentation ────────────────────────────────────────────────────

/**
 * POST /api/xos/campaigns/segment
 * Returns XOS contacts matching a segmentation query for campaign targeting.
 * Body: { tenantId?, filters: { type?, leadStatus?, source?, tags?, city?, state?,
 *   hasPhone?, hasWhatsapp?, hasEmail?, leadScoreMin?, leadScoreMax?, assignedTo? },
 *   limit?, offset? }
 */
router.post("/campaigns/segment", async (req: Request, res: Response) => {
  try {
    const { tenantId, filters = {}, limit = 500, offset = 0 } = req.body;
    const safeLimit = Math.min(Number(limit) || 500, 5000);
    const safeOffset = Math.max(Number(offset) || 0, 0);

    // Build SQL fragments dynamically
    const clauses: ReturnType<typeof sql>[] = [sql`1=1`];

    if (tenantId) clauses.push(sql`c.tenant_id = ${tenantId}`);
    if (filters.type) clauses.push(sql`c.type = ${filters.type}`);
    if (filters.city) clauses.push(sql`c.city ILIKE ${"%" + filters.city + "%"}`);
    if (filters.state) clauses.push(sql`c.state ILIKE ${"%" + filters.state + "%"}`);
    if (filters.assignedTo) clauses.push(sql`c.assigned_to = ${filters.assignedTo}`);
    if (filters.hasPhone === true) clauses.push(sql`(c.phone IS NOT NULL AND c.phone != '')`);
    if (filters.hasPhone === false) clauses.push(sql`(c.phone IS NULL OR c.phone = '')`);
    if (filters.hasWhatsapp === true) clauses.push(sql`(c.whatsapp IS NOT NULL AND c.whatsapp != '')`);
    if (filters.hasWhatsapp === false) clauses.push(sql`(c.whatsapp IS NULL OR c.whatsapp = '')`);
    if (filters.hasEmail === true) clauses.push(sql`(c.email IS NOT NULL AND c.email != '')`);
    if (filters.hasEmail === false) clauses.push(sql`(c.email IS NULL OR c.email = '')`);
    if (typeof filters.leadScoreMin === "number") clauses.push(sql`c.lead_score >= ${filters.leadScoreMin}`);
    if (typeof filters.leadScoreMax === "number") clauses.push(sql`c.lead_score <= ${filters.leadScoreMax}`);
    if (Array.isArray(filters.leadStatus) && filters.leadStatus.length > 0) {
      clauses.push(sql`c.lead_status = ANY(${filters.leadStatus})`);
    }
    if (Array.isArray(filters.source) && filters.source.length > 0) {
      clauses.push(sql`c.source = ANY(${filters.source})`);
    }
    if (Array.isArray(filters.tags) && filters.tags.length > 0) {
      clauses.push(sql`c.tags @> ${filters.tags}::text[]`);
    }

    const whereSql = sql.join(clauses, sql` AND `);

    const countResult = await db.execute(sql`SELECT COUNT(*) AS total FROM xos_contacts c WHERE ${whereSql}`);
    const total = Number(((countResult as any).rows?.[0])?.total ?? 0);

    const dataResult = await db.execute(sql`
      SELECT c.id, c.name, c.email, c.phone, c.whatsapp, c.type, c.lead_status,
             c.lead_score, c.source, c.tags, c.city, c.state, c.company,
             c.assigned_to, c.last_contact_at
      FROM xos_contacts c
      WHERE ${whereSql}
      ORDER BY c.name ASC
      LIMIT ${safeLimit} OFFSET ${safeOffset}
    `);

    const contacts = (dataResult as any).rows ?? [];
    res.json({ total, limit: safeLimit, offset: safeOffset, count: contacts.length, contacts });
  } catch (error: any) {
    console.error("Campaign segment error:", error);
    res.status(500).json({ error: "Failed to query campaign segment" });
  }
});

/**
 * GET /api/xos/campaigns — list campaigns for tenant
 */
router.get("/campaigns", async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const result = await db.execute(sql`
      SELECT id, name, description, type, status, segment_query, subject,
             scheduled_at, started_at, completed_at, stats, created_at, updated_at
      FROM xos_campaigns
      ${tenantId ? sql`WHERE tenant_id = ${tenantId}` : sql``}
      ORDER BY created_at DESC
      LIMIT 100
    `);
    res.json((result as any).rows ?? []);
  } catch (error: any) {
    console.error("List campaigns error:", error);
    res.status(500).json({ error: "Failed to list campaigns" });
  }
});

/**
 * POST /api/xos/campaigns — create campaign
 */
router.post("/campaigns", async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const userId = (req as any).user?.id;
    const { name, description, type, segmentQuery, content, subject, scheduledAt } = req.body;
    if (!name || !type) return res.status(400).json({ error: "name and type are required" });

    const result = await db.execute(sql`
      INSERT INTO xos_campaigns (tenant_id, name, description, type, status, segment_query, content, subject, scheduled_at, created_by)
      VALUES (
        ${tenantId || null}, ${name}, ${description || null}, ${type}, 'draft',
        ${segmentQuery ? JSON.stringify(segmentQuery) : null},
        ${content || null}, ${subject || null}, ${scheduledAt || null}, ${userId || null}
      )
      RETURNING *
    `);
    res.status(201).json(((result as any).rows ?? [])[0]);
  } catch (error: any) {
    console.error("Create campaign error:", error);
    res.status(500).json({ error: "Failed to create campaign" });
  }
});

/**
 * PATCH /api/xos/campaigns/:id — update campaign
 */
router.patch("/campaigns/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status, name, description, content, subject, scheduledAt, segmentQuery } = req.body;
    await db.execute(sql`
      UPDATE xos_campaigns SET
        status        = COALESCE(${status || null}, status),
        name          = COALESCE(${name || null}, name),
        description   = COALESCE(${description || null}, description),
        content       = COALESCE(${content || null}, content),
        subject       = COALESCE(${subject || null}, subject),
        scheduled_at  = COALESCE(${scheduledAt || null}, scheduled_at),
        segment_query = COALESCE(${segmentQuery ? JSON.stringify(segmentQuery) : null}::jsonb, segment_query),
        started_at    = CASE WHEN ${status || null} = 'running'                    AND started_at  IS NULL THEN NOW() ELSE started_at  END,
        completed_at  = CASE WHEN ${status || null} IN ('completed','cancelled')   AND completed_at IS NULL THEN NOW() ELSE completed_at END,
        updated_at    = NOW()
      WHERE id = ${id}
    `);
    res.json({ ok: true });
  } catch (error: any) {
    console.error("Update campaign error:", error);
    res.status(500).json({ error: "Failed to update campaign" });
  }
});

export default router;
