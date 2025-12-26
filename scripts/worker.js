#!/usr/bin/env node
/**
 * Simple job worker skeleton.
 *
 * Requirements: set DATABASE_URL env var and install `pg` (npm i pg)
 * Run: DATABASE_URL=... node scripts/worker.js
 */
const { Client } = require("pg");

const POLL_MS = parseInt(process.env.POLL_MS || "5000", 10);

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log("Worker connected, polling every", POLL_MS, "ms");

  while (true) {
    try {
      // Try to fetch one queued job and claim it
      await client.query("BEGIN");
      const res = await client.query(
        `SELECT * FROM apr.jobs WHERE status = 'queued' ORDER BY created_at ASC FOR UPDATE SKIP LOCKED LIMIT 1`
      );
      if (res.rows.length === 0) {
        await client.query("COMMIT");
        await new Promise((r) => setTimeout(r, POLL_MS));
        continue;
      }

      const job = res.rows[0];
      console.log("Claimed job", job.id, job.type);
      await client.query(
        "UPDATE apr.jobs SET status='running', attempts = attempts + 1 WHERE id = $1",
        [job.id]
      );
      await client.query("COMMIT");

      // Process job based on type
      try {
        console.log("Processing job", job.id, "type", job.type);

        if (job.type === "generate_certificate_pdf") {
          // Simulate certificate PDF generation and create an export record
          const requester =
            job.payload && job.payload.requester ? job.payload.requester : null;
          const params = job.payload || {};
          const filePath = `/exports/certificate-${job.id}.pdf`;

          await client.query(
            `INSERT INTO apr.exports (user_id, type, params, file_path, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, 'ready', NOW(), NOW())`,
            [requester, "certificate_pdf", params, filePath]
          );

          if (requester) {
            await client.query(
              `INSERT INTO apr.notifications (user_id, type, payload, link, created_at)
               VALUES ($1, $2, $3, $4, NOW())`,
              [
                requester,
                "export_ready",
                JSON.stringify({ jobId: job.id, file: filePath }),
                `/admin/exports/${job.id}`,
              ]
            );
          }

          await client.query(
            "UPDATE apr.jobs SET status='completed', updated_at = NOW() WHERE id = $1",
            [job.id]
          );
          console.log("Completed job", job.id, "generated export", filePath);
        } else if (job.type === "tile_generation") {
          // Placeholder for tile generation pipeline
          // Simulate processing time
          await new Promise((r) => setTimeout(r, 1500));
          await client.query(
            "UPDATE apr.jobs SET status='completed', updated_at = NOW() WHERE id = $1",
            [job.id]
          );
          console.log("Completed tile generation", job.id);
        } else {
          // Unknown job types: mark completed but log
          console.log("Unknown job type, marking completed:", job.type);
          await client.query(
            "UPDATE apr.jobs SET status='completed', updated_at = NOW() WHERE id = $1",
            [job.id]
          );
        }
      } catch (err) {
        console.error("Job error", err);
        await client.query(
          "UPDATE apr.jobs SET status='failed', last_error=$2, updated_at = NOW() WHERE id = $1",
          [job.id, String(err)]
        );
      }
    } catch (err) {
      console.error("Worker loop error", err);
      try {
        await client.query("ROLLBACK");
      } catch (_) {}
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
