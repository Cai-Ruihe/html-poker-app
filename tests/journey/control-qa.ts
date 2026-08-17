import { expect, type Locator } from "@playwright/test";

type ControlAction = (control: Locator) => Promise<unknown>;
type ControlOutcome = () => Promise<unknown>;

export async function exerciseControl(
  id: string,
  control: Locator,
  action: ControlAction,
  expectedOutcome: ControlOutcome,
): Promise<void> {
  await expect(control).toHaveAttribute("data-qa-control", id);
  await expect(control).toBeEnabled();
  await action(control);
  await expectedOutcome();
}

export async function exerciseControlVariant(
  id: string,
  variant: string,
  control: Locator,
  action: ControlAction,
  expectedOutcome: ControlOutcome,
): Promise<void> {
  await expect(control).toHaveAttribute("data-qa-control", id);
  await expect(control).toHaveAttribute("data-qa-variant", variant);
  await expect(control).toBeEnabled();
  await action(control);
  await expectedOutcome();
}
