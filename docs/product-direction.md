# UniVoice AI: development direction

## Delivered first: feedback drafting

Students and teachers can ask for a clearer draft, a suggested topic and clarification questions in Russian or Kazakh. They preview and explicitly apply each suggestion. Draft assistance has its own consent and does not submit the report or enable later AI analysis. Existing staff review and resolution remain human decisions.

## Next: answers grounded in each university's information

Build the university assistant around approved public materials: services, contacts, timetables, procedures and frequently asked questions. Each answer should cite its source. Every source needs a university owner and review date. When the materials do not support an answer, offer a handoff into the existing ticket flow with an author-approved draft. Do not invent university rules, deadlines, eligibility decisions or access to student records.

Start with 20–50 common questions in both languages and pilot with two different universities. Measure source correctness, whether answers helped, appropriate handoffs, first useful staff response, resolution time and staff workload. These are proposed validation criteria, not current results.

## Make onboarding repeatable before expanding

Provide institution-specific branding, approved materials, departments, responsibilities, office hours and response targets. The current architecture supports one institution per deployment and database. A shared service will require verified institution membership and isolation across records, retrieval, storage, background jobs, email and analytics, with cross-institution access tests. Department assignment alone is not an access boundary.

## Monetization hypothesis

Keep access free for students and teachers. Test an annual institutional subscription with a defined AI allowance, plus optional onboarding, knowledge maintenance and integrations. Do not charge per complaint. Validate the budget owner and willingness to pay through pilots before setting prices or adding billing. Useful outcomes and response quality should drive the offer, not the number of AI calls.

## Research references

- [University of Westminster: Unitu](https://www.westminster.ac.uk/current-students/news/download-unitu-your-student-voice-platform-to-share-feedback-and-ideas) — anonymous student feedback and visible follow-through.
- [CU Denver: student success technologies](https://www.ucdenver.edu/offices/sess/student-success/Initiatives/Technologies) — institutional conversational support and staff handoffs.
- [Ocelot chatbot](https://ocelot.ai/features/chatbot/) — institution-specific knowledge, multilingual answers and live escalation.
