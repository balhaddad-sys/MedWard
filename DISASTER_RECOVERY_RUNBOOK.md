# MedWard Pro Disaster Recovery Runbook

This runbook defines the technical recovery flow using automated backup snapshots created by `backupClinicalSnapshot`.

## Backup Source

- Storage path: `backups/clinical/*.json.gz`
- Metadata collection: `systemBackups`
- Retention: 30 days (automatic purge)

## Recovery Trigger Conditions

- Corrupted/deleted clinical records
- Failed migration
- Firestore data integrity incident

## Recovery Steps

1. Identify target snapshot timestamp in `systemBackups`.
2. Download the matching `backups/clinical/<timestamp>.json.gz` file from Cloud Storage.
3. Decompress:
   ```bash
   gzip -d <snapshot>.json.gz
   ```
4. Validate JSON structure and collection counts.
5. Restore in controlled mode:
   - pause write traffic (maintenance mode)
   - restore by collection (`patients`, `tasks`, `onCallList`, `alerts`, `users`)
6. Run post-restore checks:
   - auth login works
   - key patient/task queries return expected counts
   - audit logs continue writing
7. Re-enable write traffic and monitor for 24 hours.

## Validation Checklist

- [ ] Snapshot file integrity checked (hash/size)
- [ ] Record counts verified before restore
- [ ] Restore tested in non-production first
- [ ] Production restore approved by clinical/technical leads
- [ ] Incident report completed
