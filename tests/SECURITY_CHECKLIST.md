# Security verification checklist

- [ ] Anonymous cannot read any public table.
- [ ] Inactive user cannot access jobs or customers.
- [ ] Technician sees only assigned jobs and updates.
- [ ] Technician cannot create/edit customers or jobs.
- [ ] Technician cannot assign jobs to themselves.
- [ ] Technician can add an update only to assigned jobs.
- [ ] Office can create and assign jobs to active technicians.
- [ ] Users cannot modify their role or active flag.
- [ ] Dashboard redirects logged-out users.
- [ ] Service-role credentials never appear in client code.
- [ ] Test build, sign-in, sign-out and RLS on dedicated project.
