import { expect, test } from "@playwright/test";

test("creates nodes from the palette and edits selected node properties", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === "mobile-chrome", "HTML drag-and-drop is desktop-only here.");

  await page.goto("/");

  await expect(page.getByText("3 nodes")).toBeVisible();

  await page
    .getByRole("button", { name: "Action" })
    .dragTo(page.locator("[data-slot='workflow-builder-surface']"), {
      targetPosition: { x: 520, y: 360 },
    });
  await expect(page.getByText("4 nodes")).toBeVisible();

  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.locator("#inspector-label").fill("Kickoff");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("button", { name: "Kickoff", exact: true })).toBeVisible();
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
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.locator("#inspector-label")).toHaveValue("Start");
  await pressWorkbenchKey({
    key: "d",
    ctrlKey: true,
    bubbles: true,
    cancelable: true,
  });
  await expect(page.getByRole("button", { name: "Start", exact: true })).toHaveCount(2);

  await page.getByRole("button", { name: "Start", exact: true }).first().click();
  await pressWorkbenchKey({
    key: "Delete",
    bubbles: true,
    cancelable: true,
  });
  await expect(page.getByRole("button", { name: "Start", exact: true })).toHaveCount(1);

  await pressWorkbenchKey({
    key: "z",
    ctrlKey: true,
    bubbles: true,
    cancelable: true,
  });
  await expect(page.getByRole("button", { name: "Start", exact: true })).toHaveCount(2);

  await pressWorkbenchKey({
    key: "z",
    ctrlKey: true,
    shiftKey: true,
    bubbles: true,
    cancelable: true,
  });
  await expect(page.getByRole("button", { name: "Start", exact: true })).toHaveCount(1);
});

test("appends from the context pad and exports JSON", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.getByRole("button", { name: "Append node" }).click();
  await expect(page.getByText("4 nodes")).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  expect((await download).suggestedFilename()).toBe("graph-editor-document.json");
});
