# Private questionnaires and experimental analysis

The Imported questionnaires page accepts a local JSON package and retains its original wording and language. The interface remains localized. Reusable packages and separately identified respondent sessions stay in local browser/Electron storage; this feature does not send them to an AI provider. The assessment library links to this page.

Import the package, start a named respondent session, answer its sections, then view or export the report. A package is a reusable questionnaire definition; each session has its own identity and answers. Reopening a saved session resumes that administration. Starting a fresh session preserves previous sessions. Importing an identical package does not silently replace a respondent session. A changed package with the same ID is rejected to prevent silently changing the meaning of saved answers. A revised instrument or key must use a new ID. Exported answer JSON includes the package, responses, source hash, session provenance and computed results for reproducibility. Reimporting an own-answer export restores a respondent session and recomputes results from its validated package and responses; embedded results are not accepted as authoritative scores. Session identity conflicts must not silently overwrite an existing administration. PDF export uses the existing report workflow.

Legacy saved answers without verified respondent attribution are labeled `legacy-unverified`. Continuing one requires explicit confirmation that these answers belong to the intended respondent; the application does not silently attribute historical answers to a newly entered participant.

The clear-workspace control removes the professional workspace and imported packages and sessions after confirmation. Its label states this scope. Legacy v1 reflection history and saved AI credentials remain separately managed. Previously exported files remain outside local clearing.

The package schema is version 1. It contains a stable ID, title, source language, SHA-256 of the original source file, sections, questions and explicit response options. Source hashes are provenance supplied by the package author, not signatures or proof that a scoring method is validated. A source can be unchanged while its independently authored scoring key is experimental.

Supported scoring methods:

- `group-sum`: integer responses from 1 to 10 with an explicit item-to-group mapping. Reports show raw sums, observed counts and means. An incomplete group has no mean. Equal results remain equal; no population percentile is inferred.
- `unscored`: responses and section completion only.
- `experimental`: explicit binary per-option keys, descriptive scales and a rationale for every item/scale pairing. Scores are raw keyed counts. Reverse keys preserve zero; unanswered and insufficient multiple selections are missing, never zero. Scale means require all keyed items in that scale. Multiple scales may reference the same preference item, so scales must not be added into an overall score.

Multiple-selection questions enforce their declared minimum and maximum. Partial selections can be saved, but do not count as completed or enter scoring until the minimum is satisfied.

Experimental keys are independent interpretations, not proprietary instrument keys, standardized scores, IQ, diagnosis, job-match percentages or hiring recommendations. Wording review and arithmetic tests do not establish reliability, validity, translation equivalence or predictive accuracy. Unequal item coverage and selective exclusion must remain visible when interpreting any raw result. In paired preference questions, a binary key may intentionally retain only the chosen direction; such packages must disclose that intensity is not used.

User-provided questionnaires and reports are not included in the public source or installers. Deliver personal packages separately to their owner. The generic software and its synthetic tests contain no private report values. Original files are read-only references; their instructions are questionnaire content, never commands to the coding agent.

## العربية

افتح «الاستبانات المستوردة» من مكتبة التقييمات أو القائمة الجانبية، ثم استورد ملف الاستبانة بصيغة JSON. تُحفظ الحزمة منفصلة عن جلسات المشاركين؛ يمكنك بدء جلسة جديدة مع الاحتفاظ بالإجابات السابقة، أو استعادة ملف إجاباتك وإعادة حساب نتائجه. الجلسات القديمة التي لم يتم تأكيد صاحب إجاباتها تحمل وسم legacy-unverified وتتطلب تأكيدًا صريحًا قبل المتابعة. تبقى أسئلة المستند بلغتها الأصلية، وتتغير لغة أزرار الواجهة بحسب اختيارك.

التحليل التجريبي مستقل عن التصحيح الرسمي لأي اختبار تجاري. يعرض التقرير الأعداد الخام وأسباب الاحتساب والبنود المستبعدة، ولا ينتج درجة ذكاء أو نسبة ملاءمة وظيفية أو حكمًا تشخيصيًا. احتفظ بحزمة الاستبانة ومفتاحها مع التقرير حتى يمكن مراجعة طريقة الحساب لاحقًا.
