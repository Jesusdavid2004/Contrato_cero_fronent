import { expect, test } from '@playwright/test';
import { mockContractApi, registerTestUser, uploadFixtureContract } from './support/mock-api';

test('shows the walkthrough, asks the assistant about a clause, and follows language and theme', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lang', 'en');
    localStorage.setItem('cc_theme', 'light');
  });
  const api = await mockContractApi(page);
  await registerTestUser(page);
  await uploadFixtureContract(page);

  // Guided walkthrough: the plan comes from translation keys and the legal notice from the guidance.
  await expect(page.getByRole('heading', { name: 'Guided walkthrough' })).toBeVisible();
  await expect(page.getByText('Do not accept clause 1 as is: ask for the suggested change.')).toBeVisible();
  await expect(page.getByText('1 recent legal update may affect this contract.')).toBeVisible();

  // Ask about a specific clause from its card; the streamed answer carries a numbered citation.
  await page.getByRole('button', { name: 'Ask the assistant about this clause' }).click();
  await expect(page.getByRole('link', { name: '[1]' })).toBeVisible();
  expect(api.assistantQuestions).toEqual([{
    question: 'Explain clause 1 to me and tell me what I should do about it.',
    clauseId: 'clause-e2e-risky',
  }]);
  await expect(page.getByText('Sources', { exact: true })).toBeVisible();

  // The whole assistant follows a runtime language switch.
  await page.locator('#navbar-lang-toggle').click();
  await expect(page.getByRole('heading', { name: 'Recorrido guiado' })).toBeVisible();
  await expect(page.getByText('No aceptes la cláusula 1 tal como está: pide el cambio sugerido.')).toBeVisible();
  await expect(page.getByText('1 novedad legal reciente puede afectar este contrato.')).toBeVisible();

  // ...and the theme, without losing the conversation.
  await page.locator('#navbar-theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('link', { name: '[1]' })).toBeVisible();
});

test('lists legal radar updates and links to the official source', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lang', 'en'));
  await mockContractApi(page);
  await registerTestUser(page);

  await page.getByRole('link', { name: 'Legal radar' }).first().click();
  await expect(page.getByText('Ley 820 de 2003 (Gestor Normativo)')).toBeVisible();
  await expect(page.getByText('Official text changed')).toBeVisible();
  await expect(page.getByRole('link', { name: /Open source/ })).toHaveAttribute('href', 'https://example.test/ley-820');
});
