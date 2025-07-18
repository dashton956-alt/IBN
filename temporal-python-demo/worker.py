import asyncio
from temporalio.client import Client
from temporalio.worker import Worker
from workflow import GreetWorkflow

async def main():
    client = await Client.connect("localhost:7233")
    worker = Worker(
        client,
        task_queue="greeting-task-queue",
        workflows=[GreetWorkflow],
    )
    await worker.run()

if __name__ == "__main__":
    asyncio.run(main())
