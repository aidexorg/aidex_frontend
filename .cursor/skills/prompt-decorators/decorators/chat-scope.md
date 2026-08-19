# +++ChatScope

When this decorator is included, all subsequently specified decorators must be applied at the conversation (chat) level rather than a single message.
Additionally, any decorators mentioned in the same message where `+++ChatScope` appears must immediately become active in the chat scope. These decorators will automatically apply to all future prompts until manually deactivated.
