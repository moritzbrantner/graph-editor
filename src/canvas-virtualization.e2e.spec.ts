import { expect, test, type Page } from "@playwright/test";

const isMobileProject = (projectName: string) => projectName === "mobile-chrome";

async function openLargeGraph(page: Page) {
  await page.goto("/?fixture=large-graph");
  const surface = page.locator('[data-slot="workflow-builder-surface"]');
  await expect(surface).toHaveAttribute("data-virtualized", "true");
  return surface;
}

async function renderedNodeCount(page: Page) {
  return page.locator('[data-slot="workflow-builder-node"]').count();
}

async function readState(page: Page) {
  return JSON.parse((await page.getByLabel("Large graph state").textContent()) ?? "{}") as {
    selected: number;
    n0: { x: number; y: number };
    viewport: { x: number; y: number; zoom: number };
  };
}

test("bounds the rendered DOM on a 5,000-node graph and announces the count", async ({ page }) => {
  const surface = await openLargeGraph(page);
  const rendered = await renderedNodeCount(page);

  expect(rendered).toBeGreaterThan(0);
  expect(rendered).toBeLessThan(200);
  await expect(surface).toHaveAttribute("data-nodes-rendered", String(rendered));
  await expect(page.locator('[data-slot="workflow-builder-render-status"]')).toHaveText(
    `Showing ${rendered} of 5,000 nodes`,
  );
  // Edges to culled nodes keep their computed geometry.
  await expect(page.locator('[data-slot="workflow-builder-edge"]')).toHaveCount(4999);
});

test("panning culls and reveals nodes while dragging and marquee stay correct", async ({
  page,
}, testInfo) => {
  test.skip(isMobileProject(testInfo.project.name), "Pointer gestures are covered on desktop");
  const surface = await openLargeGraph(page);
  const box = (await surface.boundingBox())!;

  // Drag a node: it stays rendered and its position commits.
  const node = page.locator('[data-node-id="n0"]');
  const nodeBox = (await node.boundingBox())!;
  await page.mouse.move(nodeBox.x + 40, nodeBox.y + 12);
  await page.mouse.down();
  await page.mouse.move(nodeBox.x + 40, nodeBox.y + 72, { steps: 6 });
  await page.mouse.up();
  await expect.poll(async () => (await readState(page)).n0.y).toBeGreaterThan(30);

  // Empty gaps between the first grid cells, measured from rendered geometry.
  const first = (await page.locator('[data-node-id="n1"]').boundingBox())!;
  const right = (await page.locator('[data-node-id="n2"]').boundingBox())!;
  const below = (await page.locator('[data-node-id="n101"]').boundingBox())!;
  const gapX = (first.x + first.width + right.x) / 2;
  const gapY = (first.y + first.height + below.y) / 2;

  // Marquee from an empty gap selects nodes by document geometry.
  await page.keyboard.down("Shift");
  await page.mouse.move(gapX, gapY);
  await page.mouse.down();
  await page.mouse.move(gapX + 500, gapY + 200, { steps: 6 });
  await page.mouse.up();
  await page.keyboard.up("Shift");
  await expect.poll(async () => (await readState(page)).selected).toBeGreaterThan(0);

  // Pan left from the gap so the first column leaves the overscan.
  await page.mouse.move(gapX, gapY);
  await page.mouse.down();
  await page.mouse.move(box.x + 4, gapY, { steps: 10 });
  await page.mouse.up();
  const panned = (await readState(page)).viewport.x;
  expect(panned).toBeLessThan(-(gapX - box.x - 40));

  await expect(page.locator('[data-node-id="n0"]')).toHaveCount(0);
  await expect(page.locator('[data-node-id="n4"]')).toHaveCount(1);
  expect(await renderedNodeCount(page)).toBeLessThan(200);
});

test("virtualization off renders every node", async ({ page }) => {
  await page.goto("/?fixture=large-graph&nodes=600&virtualization=off");
  await expect(page.locator('[data-slot="workflow-builder-node"]')).toHaveCount(600);
  await expect(page.locator('[data-slot="workflow-builder-render-status"]')).toHaveCount(0);
});
