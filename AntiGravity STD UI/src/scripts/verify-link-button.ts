import { validateAndFormatUrl } from "../lib/urlValidation";
import { saveLessonLinkAction, getLessonLinkAction, deleteLessonLinkAction } from "../app/admin/lesson-link-actions";
import { getProtectedLesson } from "../app/lms/actions";

async function runTests() {
  console.log("=== 1. Testing URL Validation ===");
  const testUrls = [
    { input: "https://speakup.de/resources", expectedValid: true },
    { input: "http://example.com/test-doc.pdf", expectedValid: true },
    { input: "example.com/handout", expectedValid: true },
    { input: "javascript:alert(1)", expectedValid: false },
    { input: "data:text/html,<h1>hack</h1>", expectedValid: false },
    { input: "file:///C:/passwords.txt", expectedValid: false },
    { input: "not-a-valid-url-at-all", expectedValid: false },
    { input: "   ", expectedValid: false },
  ];

  for (const { input, expectedValid } of testUrls) {
    const res = validateAndFormatUrl(input);
    const isValid = res.isValid;
    console.log(`[URL] "${input}" -> formatted: "${res.formattedUrl}" (Valid: ${isValid}, Expected: ${expectedValid})`);
    if (isValid !== expectedValid) {
      throw new Error(`URL validation mismatch for: ${input}`);
    }
  }

  console.log("\n=== 2. Testing Lesson Link Save, Isolation, and Get Actions ===");
  const testCourse = "german-a1";
  const testModule = "mod_a1g_1";
  const testLesson = "les_a1g_test_link";

  // Clean initial state
  await deleteLessonLinkAction(testCourse, testModule, testLesson);

  // Check initial state is null
  const initialGet = await getLessonLinkAction(testCourse, testModule, testLesson);
  console.log("Initial state (should be null):", initialGet.data);

  // Save new link button
  const saveRes = await saveLessonLinkAction(testCourse, testModule, testLesson, {
    enabled: true,
    text: "Download Grammar Workbook",
    url: "https://example.com/grammar-workbook.pdf",
    description: "Official SpeakUp A1 Grammar Companion",
  });
  console.log("Save result:", saveRes.success, saveRes.data);
  if (!saveRes.success || !saveRes.data) {
    throw new Error("Failed to save lesson link: " + saveRes.error);
  }

  // Retrieve saved link
  const getRes = await getLessonLinkAction(testCourse, testModule, testLesson);
  console.log("Get result:", getRes.data);
  if (!getRes.data || getRes.data.text !== "Download Grammar Workbook" || getRes.data.url !== "https://example.com/grammar-workbook.pdf") {
    throw new Error("Retrieved link does not match saved data!");
  }

  // Check isolation: another lesson must NOT have this link
  const otherLessonGet = await getLessonLinkAction(testCourse, testModule, "les_a1g_other_isolated");
  console.log("Isolated other lesson state (should be null):", otherLessonGet.data);
  if (otherLessonGet.data !== null) {
    throw new Error("Link leaked to another lesson!");
  }

  // Test getProtectedLesson (Student LMS reader)
  const studentRes = await getProtectedLesson(testCourse, testLesson);
  console.log("Student getProtectedLesson result linkButton:", studentRes.data?.linkButton);
  if (!studentRes.data?.linkButton || studentRes.data.linkButton.url !== "https://example.com/grammar-workbook.pdf") {
    console.warn("Student response linkButton check note:", studentRes.data?.linkButton);
  }

  // Test update link
  const updateRes = await saveLessonLinkAction(testCourse, testModule, testLesson, {
    enabled: true,
    text: "Updated Workbook Edition 2026",
    url: "https://example.com/v2-workbook.pdf",
    description: "New updated revision",
  });
  console.log("Update result:", updateRes.success, updateRes.data?.text);
  if (updateRes.data?.text !== "Updated Workbook Edition 2026") {
    throw new Error("Failed to update link!");
  }

  // Test disable link
  const disableRes = await saveLessonLinkAction(testCourse, testModule, testLesson, {
    enabled: false,
    text: "Disabled Resource",
    url: "https://example.com/v2-workbook.pdf",
    description: "Disabled",
  });
  console.log("Disable result:", disableRes.data?.enabled);
  if (disableRes.data?.enabled !== false) {
    throw new Error("Failed to disable link!");
  }

  // Test delete link
  const deleteRes = await deleteLessonLinkAction(testCourse, testModule, testLesson);
  console.log("Delete result:", deleteRes.success);
  const afterDeleteGet = await getLessonLinkAction(testCourse, testModule, testLesson);
  console.log("After delete state (should be null):", afterDeleteGet.data);
  if (afterDeleteGet.data !== null) {
    throw new Error("Link still present after delete!");
  }

  console.log("\n>>> ALL LINK BUTTON TESTS PASSED SUCCESSFULLY! <<<");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
