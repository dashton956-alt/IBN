import asyncio
from temporalio.client import Client
from workflow import GreetWorkflow

async def main():
    client = await Client.connect("localhost:7233")
    result = await client.execute_workflow(
        GreetWorkflow.run,
        "Daniel",
        id="greet-workflow-id",
        task_queue="greeting-task-queue",
    )
    print(f"Workflow result: {result}")

if __name__ == "__main__":
    asyncio.run(main())
