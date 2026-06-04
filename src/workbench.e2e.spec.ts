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

test("supports keyboard duplicate, delete, undo, and redo", async ({ page }) => {
  await page.goto("/");

  const pressWorkbenchKey = async (init: KeyboardEventInit) => {
    await (page as any).evaluate((eventInit: KeyboardEventInit) => {
      document
        .querySelector("[data-slot='graph-workbench']")
        ?.dispatchEvent(new KeyboardEvent("keydown", eventInit));
    }, init);
  };
  await page.getByRole("button", { name: "Lead created", exact: true }).click();
  await expect(page.locator("#inspector-label")).toHaveValue("Lead created");
  await pressWorkbenchKey({
    key: "d",
    ctrlKey: true,
    bubbles: true,
    cancelable: true,
  });
  await expect(page.getByRole("button", { name: "Lead created", exact: true })).toHaveCount(2);

  await page.getByRole("button", { name: "Lead created", exact: true }).first().click();
  await pressWorkbenchKey({
    key: "Delete",
    bubbles: true,
    cancelable: true,
  });
  await expect(page.getByRole("button", { name: "Lead created", exact: true })).toHaveCount(1);

  await pressWorkbenchKey({
    key: "z",
    ctrlKey: true,
    bubbles: true,
    cancelable: true,
  });
  await expect(page.getByRole("button", { name: "Lead created", exact: true })).toHaveCount(2);

  await pressWorkbenchKey({
    key: "z",
    ctrlKey: true,
    shiftKey: true,
    bubbles: true,
    cancelable: true,
  });
  await expect(page.getByRole("button", { name: "Lead created", exact: true })).toHaveCount(1);
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
