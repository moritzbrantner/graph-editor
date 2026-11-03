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
    selectedEdges: string[];
    e99: { sourceNodeId: string; targetNodeId: string } | null;
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
  // Edges irrelevant to the viewport are culled too; the surface reports the rendered count.
  const edges = await page.locator('[data-slot="workflow-builder-edge"]').count();
  expect(edges).toBeGreaterThan(0);
  expect(edges).toBeLessThan(200);
  await expect(surface).toHaveAttribute("data-edges-rendered", String(edges));
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

test("keyboard navigation and drag snapping stay correct on a large graph", async ({
  page,
}, testInfo) => {
  test.skip(isMobileProject(testInfo.project.name), "Pointer gestures are covered on desktop");
  await openLargeGraph(page);
  const selected = (id: string) => page.locator(`[data-node-id="${id}"]`);

  // Directional navigation picks neighbours through the spatial index.
  const start = (await selected("n0").boundingBox())!;
  await page.mouse.click(start.x + 40, start.y + 12);
  await expect(selected("n0")).toHaveAttribute("data-selected", "true");
  await page.keyboard.press("ArrowRight");
  await expect(selected("n1")).toHaveAttribute("data-selected", "true");
  await page.keyboard.press("ArrowDown");
  await expect(selected("n101")).toHaveAttribute("data-selected", "true");
  await page.keyboard.press("ArrowLeft");
  await expect(selected("n100")).toHaveAttribute("data-selected", "true");
  await page.keyboard.press("ArrowUp");
  await expect(selected("n0")).toHaveAttribute("data-selected", "true");

  // Dropping n0 near n1's input snaps its matching output port flush to n1 (x = 480 - 310).
  await page.mouse.move(start.x + 40, start.y + 12);
  await page.mouse.down();
  await page.mouse.move(start.x + 40 + 165, start.y + 12 + 6, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => (await readState(page)).n0).toEqual({ x: 170, y: 0 });
});

test("cross-viewport edges stay selectable with both endpoints culled", async ({
  page,
}, testInfo) => {
  test.skip(isMobileProject(testInfo.project.name), "Pointer gestures are covered on desktop");
  // Centered on the midpoint of e99, which wraps from n99 (far right of row 0) to n100 (row 1).
  await page.goto("/?fixture=large-graph&x=-23315");
  const surface = page.locator('[data-slot="workflow-builder-surface"]');
  await expect(surface).toHaveAttribute("data-virtualized", "true");
  await expect(page.locator('[data-node-id="n99"]')).toHaveCount(0);
  await expect(page.locator('[data-node-id="n100"]')).toHaveCount(0);
  expect(await page.locator('[data-slot="workflow-builder-edge"]').count()).toBeLessThan(100);

  // The wrapped curve is point-symmetric, so the center of its box lies on the stroke.
  const hit = page.getByLabel("Connection e99", { exact: true });
  const box = (await hit.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect.poll(async () => (await readState(page)).selectedEdges).toEqual(["e99"]);
  await expect(
    page.locator('[data-slot="workflow-builder-edge"][data-selected="true"]'),
  ).toHaveCount(1);
  await expect(page.getByLabel("Rewire target for connection e99")).toHaveCount(1);
});

test("rewires a cross-viewport edge at the viewport boundary", async ({ page }, testInfo) => {
  test.skip(isMobileProject(testInfo.project.name), "Pointer gestures are covered on desktop");
  // e99's source n99 is culled; its target handle sits on n100 near the surface's left edge.
  await page.goto("/?fixture=large-graph&x=40&omitEdge=e100&selectEdge=e99");
  await expect(page.locator('[data-slot="workflow-builder-surface"]')).toHaveAttribute(
    "data-virtualized",
    "true",
  );
  await expect(page.locator('[data-node-id="n99"]')).toHaveCount(0);
  const handle = (await page.getByLabel("Rewire target for connection e99").boundingBox())!;
  const port = (await page
    .locator('[data-node-id="n101"] [data-slot="workflow-node-port"][data-port-direction="input"]')
    .boundingBox())!;

  // The handle's right half sits under n100's body, so grab its outer half.
  await page.mouse.move(handle.x + 4, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(port.x + port.width / 2, port.y + port.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect
    .poll(async () => (await readState(page)).e99)
    .toMatchObject({ sourceNodeId: "n99", targetNodeId: "n101" });
  await expect(page.getByLabel("Connection e99", { exact: true })).toHaveCount(1);
});

test("virtualization off renders every node", async ({ page }) => {
  await page.goto("/?fixture=large-graph&nodes=600&virtualization=off");
  await expect(page.locator('[data-slot="workflow-builder-node"]')).toHaveCount(600);
  await expect(page.locator('[data-slot="workflow-builder-render-status"]')).toHaveCount(0);
});
