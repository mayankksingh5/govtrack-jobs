# Automatic publication on merge

Merge this PR into main. The Publish blog articles GitHub Actions workflow reads posts.json and the complete Markdown article, then inserts a published row into the existing blog_posts table using the repository's SUPABASE_URL and SUPABASE_SERVICE_KEY secrets (the same names used by import-seed).

After the workflow succeeds, the article appears in /blog and /admin/blog. Expected public URL: https://jobportal-phi-topaz.vercel.app/blog/dsssb-tgt-computer-science-exam-date-2026

No manual copying or admin Publish click is needed. Existing slugs are skipped, preserving admin edits or unpublishing. Use the Actions tab to inspect failures or rerun the workflow. The existing blog table migration must already be installed and the two repository secrets configured; no live database write has been performed before merge.

Validation: node --test scripts/import-blog.test.mjs (3 passing); node scripts/import-blog.mjs --dry (complete article validated). Tests cover repeat imports preserving admin changes and database error propagation. Live database publication is verified by the workflow after merge.
