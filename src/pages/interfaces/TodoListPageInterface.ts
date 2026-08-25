export type TodoListFilterOption = 'All' | 'Active' | 'Completed';

export interface TodoListPageInterface {
  navigateToTodoApplication(): Promise<void>;
  addTodoItem(itemDescription: string): Promise<void>;
  toggleTodoItemCompletion(itemDescription: string): Promise<void>;
  filterTodoItemsBy(filterOption: TodoListFilterOption): Promise<void>;
  verifyTodoItemVisible(itemDescription: string): Promise<void>;
  verifyVisibleTodoItemCount(expectedCount: number): Promise<void>;
}
