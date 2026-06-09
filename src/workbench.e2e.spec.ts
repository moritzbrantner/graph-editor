import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const isMobileProject = (projectName: string) => projectName === "mobile-chrome";

async function expectNoHorizontalPageOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    )
    .toBeLessThanOrEqual(1);
}

test("switches example graphs and resets edited labels", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByLabel("Graph")).toHaveValue("lead-routing");
  await page.getByLabel("Graph").selectOption("data-pipeline");
  await expect(page.getByLabel("Graph")).toHaveValue("data-pipeline");
  await expect(page.getByRole("button", { name: "Events ingested", exact: true })).toBeVisible();
  await expect(page.getByText("7 nodes").first()).toBeVisible();

  await page.getByRole("button", { name: "Events ingested", exact: true }).click();
  await page.locator("#inspector-label").fill("Warehouse intake");
  await page.getByRole("button", { name: "Apply" }).click({ force: true });
  await expect(page.getByRole("button", { name: "Warehouse intake", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Reset" }).first().click();
  await expect(page.getByRole("button", { name: "Events ingested", exact: true })).toBeVisible();
});

test("creates nodes from the palette and edits custom node fields", async ({ page }, testInfo) => {
  await page.goto("/");

  await expect(page.getByText("6 nodes").first()).toBeVisible();

  if (isMobileProject(testInfo.project.name)) {
    await page.getByPlaceholder("Search nodes").fill("Retry");
    await page.getByRole("button", { name: "Retry/backoff" }).click();
  } else {
    await page
      .getByRole("button", { name: "Retry/backoff" })
      .dragTo(page.locator("[data-slot='workflow-builder-surface']"), {
        targetPosition: { x: 520, y: 360 },
      });
  }
  await expect(page.getByText("7 nodes").first()).toBeVisible();

  await page.getByRole("button", { name: "Lead created", exact: true }).click();
  if (isMobileProject(testInfo.project.name)) {
    await expectNoHorizontalPageOverflow(page);
  }
  await page.locator("#inspector-owner").fill("Lifecycle Ops");
  await page.locator("#inspector-setting").fill("source == crm");
  await page.getByRole("button", { name: "Apply" }).click({ force: true });
  await expect(page.locator("#inspector-owner")).toHaveValue("Lifecycle Ops");
});

test("supports duplicate, delete, undo, and redo commands", async ({ page }, testInfo) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Lead created", exact: true }).click();
  if (isMobileProject(testInfo.project.name)) {
    await expectNoHorizontalPageOverflow(page);
  }
  await expect(page.locator("#inspector-label")).toHaveValue("Lead created");
  await page.getByRole("button", { name: "Duplicate" }).first().click();
  await expect(page.getByRole("button", { name: "Lead created", exact: true })).toHaveCount(2);

  await page.getByRole("button", { name: "Lead created", exact: true }).first().click();
  if (isMobileProject(testInfo.project.name)) {
    await expectNoHorizontalPageOverflow(page);
  }
  await page.getByRole("button", { name: "Delete" }).first().click();
  await expect(page.getByRole("button", { name: "Lead created", exact: true })).toHaveCount(1);

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("button", { name: "Lead created", exact: true })).toHaveCount(2);

  await page.getByRole("button", { name: "Redo" }).click();
  await expect(page.getByRole("button", { name: "Lead created", exact: true })).toHaveCount(1);
});

test("undoes and redoes a node drag as one operation", async ({ page }, testInfo) => {
  await page.goto("/");

  if (isMobileProject(testInfo.project.name)) {
    await page.getByRole("button", { name: "Lead created", exact: true }).click();
    await expectNoHorizontalPageOverflow(page);
    await page.getByRole("button", { name: "Duplicate" }).click();
    await expect(page.getByRole("button", { name: "Lead created", exact: true })).toHaveCount(2);
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByRole("button", { name: "Lead created", exact: true })).toHaveCount(1);
    await page.getByRole("button", { name: "Redo" }).click();
    await expect(page.getByRole("button", { name: "Lead created", exact: true })).toHaveCount(2);
    return;
  }

  const node = page.locator("[data-slot='workflow-builder-node'][data-node-id='lead-created']");
  const getNodePosition = () =>
    node.evaluate((element) => {
      const style = getComputedStyle(element);
      return `${style.left},${style.top}`;
    });
  const originalPosition = await getNodePosition();
  const box = await node.boundingBox();
  expect(box).not.toBeNull();

  await page.mouse.move(box!.x + 40, box!.y + 32);
  await page.mouse.down();
  await page.mouse.move(box!.x + 150, box!.y + 72, { steps: 8 });
  await page.mouse.up();

  const movedPosition = await getNodePosition();
  expect(movedPosition).not.toBe(originalPosition);
  await expect(page.getByRole("button", { name: "Undo" })).toBeEnabled();

  await page.getByRole("button", { name: "Undo" }).click();
  await expect.poll(() => getNodePosition()).toBe(originalPosition);

  await page.getByRole("button", { name: "Redo" }).click();
  await expect.poll(() => getNodePosition()).toBe(movedPosition);
});

test("appends from the context pad and exports JSON", async ({ page }, testInfo) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Lead created", exact: true }).click();
  if (isMobileProject(testInfo.project.name)) {
    await expectNoHorizontalPageOverflow(page);
  }
  await page.getByRole("button", { name: "Append node" }).click();
  await expect(page.getByText("7 nodes").first()).toBeVisible();
  await expect(
    page.locator("[data-slot='workflow-node-select'][aria-label='Retry/backoff']"),
  ).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  expect((await download).suggestedFilename()).toBe("graph-editor-document.json");
});

test("filters the palette and toggles the minimap", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByLabel("Workflow minimap")).toBeVisible();
  await page.getByRole("button", { name: "Hide minimap" }).click();
  await expect(page.getByLabel("Workflow minimap")).toBeHidden();
  await page.getByRole("button", { name: "Show minimap" }).click();
  await expect(page.getByLabel("Workflow minimap")).toBeVisible();

  await page.getByPlaceholder("Search nodes").fill("Retry");
  await expect(page.getByRole("button", { name: "Retry/backoff" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Event trigger" })).toBeHidden();
});

test("supports keyboard duplicate and group commands", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Lead created", exact: true }).click();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+D" : "Control+D");
  await expect(page.getByRole("button", { name: "Lead created", exact: true })).toHaveCount(2);

  await page.getByRole("button", { name: "Lead created", exact: true }).first().click();
  await page.getByRole("button", { name: "Group selection" }).first().click();
  await expect(
    page.locator("[data-slot='workflow-builder-group'][data-selected='true']"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Ungroup selection" }).first()).toBeEnabled();
  await page.getByRole("button", { name: "Ungroup selection" }).first().click();
});

test("imports JSON and honors read-only mode", async ({ page }) => {
  await page.goto("/");

  await page.locator("input[type='file']").setInputFiles({
    name: "imported-graph.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        nodes: [{ id: "imported", label: "Imported node", x: 0, y: 0 }],
        edges: [],
      }),
    ),
  });
  await expect(page.getByRole("button", { name: "Imported node", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Read only" }).click();
  await page.getByRole("button", { name: "Imported node", exact: true }).click();
  await expect(page.getByRole("button", { name: "Delete" }).first()).toBeDisabled();
  await expect(page.getByRole("button", { name: "Retry/backoff" })).toBeDisabled();
});

test("shows and dismisses invalid import errors", async ({ page }) => {
  await page.goto("/");

  await page.locator("input[type='file']").setInputFiles({
    name: "broken-graph.json",
    mimeType: "application/json",
    buffer: Buffer.from("{"),
  });

  await expect(page.getByRole("alert")).toContainText("Import failed");
  await expect(page.getByRole("button", { name: "Lead created", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Dismiss error" }).click();
  await expect(page.getByRole("alert")).toBeHidden();
});

test("supports keyboard node navigation and nudging", async ({ page }, testInfo) => {
  test.skip(isMobileProject(testInfo.project.name), "Keyboard node movement is covered on desktop");
  await page.goto("/");

  const canvas = page.locator("[data-slot='workflow-builder']");
  const leadNode = page.locator("[data-slot='workflow-builder-node'][data-node-id='lead-created']");
  const rightAlignedNode = page.locator(
    "[data-slot='workflow-builder-node'][data-node-id='enterprise']",
  );
  const getNodePosition = (node: typeof leadNode) =>
    node.evaluate((element) => {
      const style = getComputedStyle(element);
      return `${style.left},${style.top}`;
    });

  await page.getByRole("button", { name: "Lead created", exact: true }).click();
  const originalLeadPosition = await getNodePosition(leadNode);
  await canvas.focus();
  await page.keyboard.press("Shift+ArrowRight");
  await expect.poll(() => getNodePosition(leadNode)).not.toBe(originalLeadPosition);

  await page.getByRole("button", { name: "Lead created", exact: true }).click();
  await expect(leadNode).toHaveAttribute("data-selected", "true");
  await canvas.focus();
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.getAttribute("data-slot")))
    .toBe("workflow-builder");
  await page.keyboard.press("ArrowRight");
  await expect(rightAlignedNode).toHaveAttribute("data-selected", "true");

  const originalRightAlignedPosition = await getNodePosition(rightAlignedNode);
  await page.getByRole("button", { name: "Read only" }).click();
  await canvas.focus();
  await page.keyboard.press("Shift+ArrowRight");
  await expect.poll(() => getNodePosition(rightAlignedNode)).toBe(originalRightAlignedPosition);
});

test("has no serious accessibility violations in the workbench", async ({ page }) => {
  await page.goto("/");

  const results = await new AxeBuilder({ page }).include("[data-slot='graph-workbench']").analyze();
  const seriousViolations = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );

  expect(seriousViolations).toEqual([]);
});
