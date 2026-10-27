import { expect, test } from "@playwright/test";
import type { ModelViewerElement } from "@google/model-viewer";
import ru from "../src/messages/public-ru.json";
import kk from "../src/messages/public-kk.json";

const modelPath = "/models/campus/atyrau-main-building.glb";

test("campus loads on request, rotates by topic and restores the selected view", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const modelRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.endsWith(".glb")) modelRequests.push(request.url());
  });

  await page.goto("/");
  const campus = page.getByRole("region", { name: ru.landing.campus.title, exact: true });
  const poster = campus.getByRole("img", { name: ru.landing.campus.modelAlt, exact: true });
  await expect(poster).toBeVisible();
  await expect
    .poll(() => poster.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);
  await expect(campus.locator("model-viewer")).toHaveCount(0);
  expect(modelRequests).toHaveLength(0);

  const modelResponse = page.waitForResponse(
    (response) => new URL(response.url()).pathname === modelPath,
  );
  await campus.getByRole("button", { name: ru.landing.campus.load3d, exact: true }).click();
  expect((await modelResponse).ok()).toBe(true);
  const viewer = campus.locator("model-viewer");
  await expect(viewer).toBeVisible({ timeout: 20000 });
  await expect
    .poll(() => viewer.evaluate((element: ModelViewerElement) => element.loaded))
    .toBe(true);
  expect(modelRequests).toHaveLength(1);
  await expect(
    campus.getByRole("button", { name: ru.landing.campus.load3d, exact: true }),
  ).toHaveCount(0);

  const readOrbit = () =>
    viewer.evaluate((element: ModelViewerElement) => {
      const { theta, phi, radius } = element.getCameraOrbit();
      return { theta, phi, radius };
    });
  const initialOrbit = await readOrbit();
  expect(initialOrbit.theta).toBeGreaterThan(0);
  expect(initialOrbit.theta).toBeLessThan(Math.PI / 2);

  const topics = campus.getByRole("group", { name: ru.landing.campus.chooseTopic, exact: true });
  await topics
    .getByRole("button", { name: ru.landing.campus.topics.infrastructure.label, exact: true })
    .click();
  await expect.poll(async () => (await readOrbit()).theta).toBeLessThan(0);
  const selectedOrbit = await readOrbit();
  await expect(
    campus.getByRole("link", { name: ru.landing.campus.openTopic, exact: true }),
  ).toHaveAttribute("href", "/submit?category=infrastructure");

  await viewer.getByRole("img").press("ArrowRight");
  await expect
    .poll(async () => Math.abs((await readOrbit()).theta - selectedOrbit.theta))
    .toBeGreaterThan(0.05);
  await campus.getByRole("button", { name: ru.landing.campus.reset, exact: true }).click();
  await expect
    .poll(async () => Math.abs((await readOrbit()).theta - selectedOrbit.theta))
    .toBeLessThan(0.01);

  await topics
    .getByRole("button", { name: ru.landing.campus.topics.communication.label, exact: true })
    .click();
  await expect
    .poll(async () => Math.abs((await readOrbit()).theta - selectedOrbit.theta))
    .toBeGreaterThan(0.2);
  await topics
    .getByRole("button", { name: ru.landing.campus.topics.education.label, exact: true })
    .click();
  await expect
    .poll(async () => Math.abs((await readOrbit()).theta - initialOrbit.theta))
    .toBeLessThan(0.01);

  await page.getByRole("button", { name: "ҚАЗ", exact: true }).click();
  const localizedCampus = page.getByRole("region", { name: kk.landing.campus.title, exact: true });
  await expect(
    localizedCampus.locator("model-viewer").getByRole("img", { name: kk.landing.campus.modelAlt }),
  ).toBeVisible();
  await expect(
    localizedCampus.getByRole("button", { name: kk.landing.campus.reset, exact: true }),
  ).toBeVisible();
  expect(modelRequests).toHaveLength(1);
});

test("a failed campus model keeps the poster and topic navigation available", async ({ page }) => {
  await page.route(`**${modelPath}`, (route) => route.abort());
  await page.goto("/");
  const campus = page.getByRole("region", { name: ru.landing.campus.title, exact: true });
  await campus.getByRole("button", { name: ru.landing.campus.load3d, exact: true }).click();
  await expect(campus.getByText(ru.landing.campus.fallback, { exact: true })).toBeVisible({
    timeout: 20000,
  });
  await expect(
    campus.getByRole("img", { name: ru.landing.campus.modelAlt, exact: true }),
  ).toBeVisible();
  await campus
    .getByRole("button", { name: ru.landing.campus.topics.infrastructure.label, exact: true })
    .click();
  await campus.getByRole("link", { name: ru.landing.campus.openTopic, exact: true }).click();
  await expect(page).toHaveURL(/\/submit\?category=infrastructure$/);
});
