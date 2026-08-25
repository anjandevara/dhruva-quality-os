import { Page, expect } from '@playwright/test';
import { TodoListPageInterface, TodoListFilterOption } from './interfaces/TodoListPageInterface';
import { FormHelper } from '../components/FormHelper';
import { DataDisplayControls } from '../components/DataDisplayControls';
import { NavigationControls } from '../components/NavigationControls';
import { Logger } from '../utils/logger';

const newTodoInputLabel = 'What needs to be done?';

export class TodoListPage implements TodoListPageInterface {
  constructor(private readonly page: Page) {}

  async navigateToTodoApplication(): Promise<void> {
    Logger.info('Navigating to TodoMVC reference application');
    await this.page.goto('/todomvc');
  }

  async addTodoItem(itemDescription: string): Promise<void> {
    Logger.info(`Adding todo item: ${itemDescription}`);
    await FormHelper.fillInput(this.page, newTodoInputLabel, itemDescription);
    await FormHelper.submitViaEnterKey(this.page, newTodoInputLabel);
  }

  async toggleTodoItemCompletion(itemDescription: string): Promise<void> {
    await DataDisplayControls.toggleListItemCheckbox(this.page, itemDescription);
  }

  async filterTodoItemsBy(filterOption: TodoListFilterOption): Promise<void> {
    await NavigationControls.clickNavigationLink(this.page, filterOption);
  }

  async verifyTodoItemVisible(itemDescription: string): Promise<void> {
    Logger.info(`Verifying todo item visible: ${itemDescription}`);
    const item = DataDisplayControls.checkableListItems(this.page).filter({ hasText: itemDescription });
    await expect(item).toBeVisible();
  }

  async verifyVisibleTodoItemCount(expectedCount: number): Promise<void> {
    Logger.info(`Verifying visible todo item count equals: ${expectedCount}`);
    await expect(DataDisplayControls.checkableListItems(this.page)).toHaveCount(expectedCount);
  }
}
