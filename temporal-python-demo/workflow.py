from temporalio import workflow

@workflow.defn
class GreetWorkflow:
    @workflow.run
    async def run(self, name: str) -> str:
        return f"Hello, {name}! From Temporal 🌀"
