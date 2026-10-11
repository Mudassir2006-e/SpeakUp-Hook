import {
  getCentralPrivacyAction,
  saveCentralPrivacyAction,
  CentralPrivacyItem,
} from "../app/admin/privacy-actions";
import fs from "fs";
import path from "path";

async function runTest() {
  console.log("=== PRIVACY POLICY MANAGEMENT WORKFLOW TEST ===");

  // 1. Initial Load Test
  const initialRes = await getCentralPrivacyAction();
  if (!initialRes.success || !initialRes.data) {
    throw new Error("Failed to load initial privacy sections.");
  }
  console.log(`✓ Loaded ${initialRes.data.length} initial privacy sections.`);

  // 2. Verify specifically unwanted sections do NOT exist
  const unwantedNames = [
    "Personal License Only",
    "Performance",
    "Performance Telemetry",
    "Data Maintenance",
    "Financial Confidentiality",
    "Academic Copyright",
  ];

  for (const item of initialRes.data) {
    for (const unwanted of unwantedNames) {
      if (
        item.title.toLowerCase().includes(unwanted.toLowerCase()) ||
        item.content.toLowerCase().includes(unwanted.toLowerCase())
      ) {
        throw new Error(`Unwanted section found in privacy policy: ${unwanted}`);
      }
    }
  }
  console.log("✓ Verified all 5 unwanted sections are completely absent.");

  // 3. Test Add Section
  const testList: CentralPrivacyItem[] = [
    ...initialRes.data,
    {
      id: `test-add-${Date.now()}`,
      number: initialRes.data.length + 1,
      title: "Automated Data Retention & Audit Protocol",
      content: "Student verification tokens and session telemetry are purged after six months of inactivity.",
    },
  ];
  const addRes = await saveCentralPrivacyAction(testList);
  if (!addRes.success || addRes.data?.length !== testList.length) {
    throw new Error("Failed to add section.");
  }
  console.log(`✓ Added section. Total sections now: ${addRes.data.length}`);

  // 4. Test Edit Section
  const toEdit = addRes.data[addRes.data.length - 1];
  toEdit.title = "Updated Automated Data Retention & Audit Protocol";
  toEdit.content = "Updated description for test verification.";
  const editRes = await saveCentralPrivacyAction(addRes.data);
  const foundEdited = editRes.data?.find((s) => s.id === toEdit.id);
  if (foundEdited?.title !== "Updated Automated Data Retention & Audit Protocol") {
    throw new Error("Failed to edit section.");
  }
  console.log("✓ Edited section successfully verified.");

  // 5. Test Reorder (swap first and second)
  const reordered = [editRes.data![1], editRes.data![0], ...editRes.data!.slice(2)];
  const reorderRes = await saveCentralPrivacyAction(reordered);
  if (
    reorderRes.data![0].number !== 1 ||
    reorderRes.data![1].number !== 2 ||
    reorderRes.data![0].id !== reordered[0].id
  ) {
    throw new Error("Sequential renumbering after reorder failed.");
  }
  console.log("✓ Reorder and sequential renumbering 1..N verified.");

  // 6. Test Delete Section
  const withoutNew = reorderRes.data!.filter((s) => s.id !== toEdit.id);
  const deleteRes = await saveCentralPrivacyAction(withoutNew);
  if (deleteRes.data?.some((s) => s.id === toEdit.id)) {
    throw new Error("Section deletion failed.");
  }
  console.log(`✓ Deleted section. Total sections returned to: ${deleteRes.data?.length}`);

  // 7. Restore canonical sections in correct original order
  const canonical: CentralPrivacyItem[] = [
    {
      id: "priv-1",
      number: 1,
      title: "Certification Integrity & Public Registry",
      content:
        "Upon successful completion of course requirements, certificates are assigned a permanent serial code. Third-party employers may only verify certificate authenticity and completion date via our registry.",
    },
    {
      id: "priv-2",
      number: 2,
      title: "Governance Inquiries & Account Deletion",
      content:
        "Students maintain the right to review registered personal information or request data archiving upon course completion by contacting our academic administration desk at admissions@speakup.com.",
    },
  ];
  await saveCentralPrivacyAction(canonical);

  // 8. Verify persistence by direct file read
  const filePath = path.join(process.cwd(), "src", "config", "central-privacy.json");
  const persistedRaw = fs.readFileSync(filePath, "utf-8");
  const persisted = JSON.parse(persistedRaw);
  if (persisted.length !== 2 || persisted[0].number !== 1 || persisted[1].number !== 2) {
    throw new Error("Persistence verification failed.");
  }
  console.log("✓ Persistence in central-privacy.json verified after reload.");

  console.log("=== ALL PRIVACY POLICY TESTS PASSED SUCCESSFULLY! ===");
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
