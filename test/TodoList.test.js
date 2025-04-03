const TodoList = artifacts.require("TodoList");

contract("TodoList", (accounts) => {
  let todoList;

  // Deploy a fresh contract before each test
  beforeEach(async () => {
    todoList = await TodoList.new();
  });

  it("should initialize with a default task", async () => {
    // Check initial task count
    const taskCount = await todoList.taskCount();
    assert.equal(taskCount.toNumber(), 1, "Initial task count should be 1");

    // Fetch the first task (ID = 1)
    const task = await todoList.tasks(1);
    assert.equal(task.id.toNumber(), 1, "Task ID should be 1");
    assert.equal(
      task.content,
      "Check out dappuniversity.com",
      "Content mismatch"
    );
    assert.equal(task.completed, false, "Task should be incomplete");
  });

  it("should allow creating a new task", async () => {
    // Create a new task
    await todoList.createTask("Learn Solidity", { from: accounts[0] });

    // Check updated task count
    const taskCount = await todoList.taskCount();
    assert.equal(taskCount.toNumber(), 2, "Task count should increment to 2");

    // Fetch the new task (ID = 2)
    const task = await todoList.tasks(2);
    assert.equal(task.id.toNumber(), 2, "New task ID should be 2");
    assert.equal(task.content, "Learn Solidity", "Content mismatch");
    assert.equal(task.completed, false, "New task should be incomplete");
  });
});
