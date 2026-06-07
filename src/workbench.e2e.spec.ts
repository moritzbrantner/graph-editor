import { expect, test } from "@playwright/test";

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
  test.skip(testInfo.project.name === "mobile-chrome", "HTML drag-and-drop is desktop-only here.");

  await page.goto("/");

  await expect(page.getByText("6 nodes").first()).toBeVisible();

  await page
    .getByRole("button", { name: "Retry/backoff" })
    .dragTo(page.locator("[data-slot='workflow-builder-surface']"), {
      targetPosition: { x: 520, y: 360 },
    });
  await expect(page.getByText("7 nodes").first()).toBeVisible();

  await page.getByRole("button", { name: "Lead created", exact: true }).click();
  await page.locator("#inspector-owner").fill("Lifecycle Ops");
  await page.locator("#inspector-setting").fill("source == crm");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.locator("#inspector-owner")).toHaveValue("Lifecycle Ops");
});

test("supports duplicate, delete, undo, and redo commands", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Lead created", exact: true }).click();
  await expect(page.locator("#inspector-label")).toHaveValue("Lead created");
  await page.getByRole("button", { name: "Duplicate" }).first().click();
  await expect(page.getByRole("button", { name: "Lead created", exact: true })).toHaveCount(2);

  await page.getByRole("button", { name: "Lead created", exact: true }).first().click();
  await page.getByRole("button", { name: "Delete" }).first().click();
  await expect(page.getByRole("button", { name: "Lead created", exact: true })).toHaveCount(1);

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("button", { name: "Lead created", exact: true })).toHaveCount(2);

  await page.getByRole("button", { name: "Redo" }).click();
  await expect(page.getByRole("button", { name: "Lead created", exact: true })).toHaveCount(1);
});

test("undoes and redoes a node drag as one operation", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile-chrome", "Pointer drag assertion is desktop-only.");

  await page.goto("/");

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

test("appends from the context pad and exports JSON", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Lead created", exact: true }).click();
  await page.getByRole("button", { name: "Append node" }).click();
  await expect(page.getByText("7 nodes").first()).toBeVisible();
  await expect(
    page.locator("[data-slot='workflow-node-select'][aria-label='Retry/backoff']"),
  ).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  expect((await download).suggestedFilename()).toBe("graph-editor-document.json");
});
