# Workspace metadata in a hidden folder

The app will keep its own workspace metadata in a hidden `.simpler/` folder instead of writing mandatory frontmatter or app-specific fields into every note. Notes should remain portable Markdown files, while app state such as preferences, search cache, sync history, and conflict state can be isolated and partially regenerated.
