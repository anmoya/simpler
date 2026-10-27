mod order_conflicts {
    use super::*;

    const ORDER_METADATA: &str = ".simpler/workspace.json";
    const LOCAL_ORDER: [&str; 4] = ["c.md", "b.md", "a.md", "README.md"];
    const REMOTE_ORDER: [&str; 4] = ["b.md", "a.md", "c.md", "README.md"];

    fn request(
        workspace: &Path,
        domain: NativeDomain,
        action: &str,
        extra: serde_json::Value,
    ) -> NativeCommandResponse {
        let mut payload = extra;
        payload["workspacePath"] = serde_json::json!(workspace);
        dispatch_native_command(NativeCommandRequest {
            domain,
            action: action.into(),
            payload,
        })
    }

    fn open(workspace: &Path) -> NativeCommandResponse {
        request(
            workspace,
            NativeDomain::Workspace,
            "open",
            serde_json::json!({}),
        )
    }

    fn sync(workspace: &Path) -> NativeCommandResponse {
        request(workspace, NativeDomain::Git, "sync", serde_json::json!({}))
    }

    fn order(workspace: &Path, paths: &[&str]) {
        let response = request(
            workspace,
            NativeDomain::Workspace,
            "set-tree-order",
            serde_json::json!({ "parentPath": "", "orderedPaths": paths }),
        );
        assert!(response.ok, "{:?}", response.error);
    }

    fn resolve(workspace: &Path, path: &str, resolution: &str) -> NativeCommandResponse {
        request(
            workspace,
            NativeDomain::Git,
            "resolve-conflict",
            serde_json::json!({ "notePath": path, "resolution": resolution }),
        )
    }

    fn copies(name: &str) -> (PathBuf, PathBuf, PathBuf) {
        let (first, remote) = test_git_workspace_with_remote(name);
        for name in ["a.md", "b.md", "c.md"] {
            fs::write(first.join(name), "Baseline\n").unwrap();
        }
        order(&first, &["README.md", "a.md", "b.md", "c.md"]);
        let initial_sync = sync(&first);
        assert!(initial_sync.ok, "{:?}", initial_sync.error);
        let second = first.parent().unwrap().join("second");
        git_ok(
            first.parent().unwrap(),
            &["clone", remote.to_str().unwrap(), "second"],
        );
        configure_git_identity(&second);
        (first, second, remote)
    }

    #[test]
    fn concurrent_order_changes_resolve_local_and_remote_through_sync() {
        for choice in ["local", "remote"] {
            let (first, second, remote) = copies(&format!("order_conflict_{choice}"));
            order(&first, &LOCAL_ORDER);
            order(&second, &REMOTE_ORDER);
            assert!(sync(&second).ok);
            let conflicted = sync(&first);
            assert!(conflicted.ok, "{:?}", conflicted.error);
            let conflict_data = conflicted.data.unwrap();
            assert_eq!(conflict_data["status"], "conflict");
            assert_eq!(
                conflict_data["conflictedFiles"],
                serde_json::json!([ORDER_METADATA])
            );
            let marked = fs::read_to_string(first.join(ORDER_METADATA)).unwrap();
            assert!(marked.contains("<<<<<<<"));
            let reopened = open(&first);
            assert!(reopened.ok, "{:?}", reopened.error);
            assert_eq!(reopened.data.unwrap()["tree"].as_array().unwrap().len(), 4);
            assert_eq!(
                fs::read_to_string(first.join(ORDER_METADATA)).unwrap(),
                marked
            );
            let resolved = resolve(&first, ORDER_METADATA, choice);
            assert!(resolved.ok, "{:?}", resolved.error);
            assert_eq!(resolved.data.unwrap()["status"], "synced");
            let expected = if choice == "local" {
                LOCAL_ORDER
            } else {
                REMOTE_ORDER
            };
            let reopened = open(&first);
            assert!(reopened.ok, "{:?}", reopened.error);
            let data = reopened.data.unwrap();
            let paths: Vec<_> = data["tree"]
                .as_array()
                .unwrap()
                .iter()
                .map(|item| item["path"].as_str().unwrap())
                .collect();
            assert_eq!(paths, expected);
            let remote_metadata: serde_json::Value = serde_json::from_str(&git_stdout(
                &remote,
                &["show", "main:.simpler/workspace.json"],
            ))
            .unwrap();
            assert_eq!(
                remote_metadata["manualTreeOrder"][""],
                serde_json::json!(expected)
            );
        }
    }

    #[test]
    fn mixed_order_and_note_conflicts_can_continue_through_repeated_rebase_conflicts() {
        let (first, second, _) = copies("mixed_order_conflicts");
        order(&first, &LOCAL_ORDER);
        fs::write(first.join("a.md"), "First local note\n").unwrap();
        git_ok(&first, &["add", "-A"]);
        git_ok(&first, &["commit", "-m", "First local organization"]);
        let final_order = ["a.md", "c.md", "b.md", "README.md"];
        order(&first, &final_order);
        fs::write(first.join("a.md"), "Second local note\n").unwrap();
        git_ok(&first, &["add", "-A"]);
        git_ok(&first, &["commit", "-m", "Second local organization"]);
        order(&second, &REMOTE_ORDER);
        fs::write(second.join("a.md"), "Remote note\n").unwrap();
        assert!(sync(&second).ok);
        let conflicted = sync(&first);
        assert!(conflicted.ok, "{:?}", conflicted.error);
        let paths = conflicted.data.unwrap()["conflictedFiles"]
            .as_array()
            .unwrap()
            .clone();
        assert!(paths.contains(&serde_json::json!(ORDER_METADATA)));
        assert!(paths.contains(&serde_json::json!("a.md")));
        let metadata_remote = resolve(&first, ORDER_METADATA, "remote");
        assert!(metadata_remote.ok, "{:?}", metadata_remote.error);
        assert_eq!(
            metadata_remote.data.unwrap()["conflictedFiles"],
            serde_json::json!(["a.md"])
        );
        let next_commit = resolve(&first, "a.md", "remote");
        assert!(next_commit.ok, "{:?}", next_commit.error);
        assert_eq!(next_commit.data.as_ref().unwrap()["status"], "conflict");
        assert!(next_commit.data.unwrap()["conflictedFiles"]
            .as_array()
            .unwrap()
            .contains(&serde_json::json!(ORDER_METADATA)));
        let metadata_local = resolve(&first, ORDER_METADATA, "local");
        assert!(metadata_local.ok, "{:?}", metadata_local.error);
        assert_eq!(metadata_local.data.unwrap()["status"], "conflict");
        let note_local = resolve(&first, "a.md", "local");
        assert!(note_local.ok, "{:?}", note_local.error);
        assert_eq!(note_local.data.unwrap()["status"], "synced");
        assert_eq!(
            fs::read_to_string(first.join("a.md")).unwrap(),
            "Second local note\n"
        );
        let opened = open(&first).data.unwrap();
        let paths: Vec<_> = opened["tree"]
            .as_array()
            .unwrap()
            .iter()
            .map(|item| item["path"].as_str().unwrap())
            .collect();
        assert_eq!(paths, final_order);
    }

    #[test]
    fn invalid_order_resolution_preserves_conflict_until_a_valid_side_is_chosen() {
        for invalid in [
            serde_json::json!({ "schemaVersion": 2, "manualTreeOrder": { "": REMOTE_ORDER } }),
            serde_json::json!({ "schemaVersion": 1, "manualTreeOrder": { "": ["b.md", "b.md"] } }),
        ] {
            let (first, second, _) = copies("invalid_order_choice");
            order(&first, &LOCAL_ORDER);
            fs::write(
                second.join(ORDER_METADATA),
                serde_json::to_string_pretty(&invalid).unwrap(),
            )
            .unwrap();
            git_ok(&second, &["add", ORDER_METADATA]);
            git_ok(&second, &["commit", "-m", "Invalid external metadata"]);
            git_ok(&second, &["push", "origin", "main"]);
            let conflicted = sync(&first);
            assert!(conflicted.ok, "{:?}", conflicted.error);
            assert_eq!(conflicted.data.unwrap()["status"], "conflict");
            let marked = fs::read(first.join(ORDER_METADATA)).unwrap();
            let index = git_stdout(&first, &["ls-files", "-u"]);
            for choice in ["remote", "manual"] {
                let invalid_choice = resolve(&first, ORDER_METADATA, choice);
                assert!(!invalid_choice.ok, "{choice}");
                assert_eq!(fs::read(first.join(ORDER_METADATA)).unwrap(), marked);
                assert_eq!(git_stdout(&first, &["ls-files", "-u"]), index);
                assert!(open(&first).ok);
            }
            let recovered = resolve(&first, ORDER_METADATA, "local");
            assert!(recovered.ok, "{:?}", recovered.error);
            assert_eq!(recovered.data.unwrap()["status"], "synced");
            assert!(open(&first).ok);
        }
        let malformed_workspace = test_workspace("invalid_order_without_conflict");
        assert!(open(&malformed_workspace).ok);
        fs::write(malformed_workspace.join(ORDER_METADATA), "<<<<<<< not JSON").unwrap();
        let malformed = open(&malformed_workspace);
        assert!(!malformed.ok);
        assert_eq!(
            fs::read_to_string(malformed_workspace.join(ORDER_METADATA)).unwrap(),
            "<<<<<<< not JSON"
        );
    }
}
