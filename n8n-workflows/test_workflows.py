#!/usr/bin/env python3
"""Unit tests for n8n Google Sheets workflow JSON files."""

import json
import os
import sys
import unittest

WORKFLOW_DIR = os.path.dirname(os.path.abspath(__file__))
EXPECTED_SHEET_URL = "https://docs.google.com/spreadsheets/d/1M4VlcIMm-YdWt8srrlNPcdg7Jx2CXXtHHsr8Avc_tfo/edit"
EXPECTED_SPREADSHEET_ID = "1M4VlcIMm-YdWt8srrlNPcdg7Jx2CXXtHHsr8Avc_tfo"
SHEET_TABS = ["Electronics Leads", "Outreach Log", "Small Business Leads"]

FILES = {
    "setup": os.path.join(WORKFLOW_DIR, "00-google-sheets-setup.json"),
    "electronics": os.path.join(WORKFLOW_DIR, "01-electronics-lead-scraper.json"),
    "outreach": os.path.join(WORKFLOW_DIR, "02-outreach-pipeline.json"),
    "small_biz": os.path.join(WORKFLOW_DIR, "03-small-business-leads.json"),
}


def load_workflow(path):
    with open(path, "r") as f:
        return json.load(f)


class TestAllFilesExistAndAreValidJSON(unittest.TestCase):
    def test_all_files_exist(self):
        for name, path in FILES.items():
            self.assertTrue(os.path.exists(path), f"Missing file: {path}")

    def test_all_files_are_valid_json(self):
        for name, path in FILES.items():
            try:
                load_workflow(path)
            except json.JSONDecodeError as e:
                self.fail(f"{name} ({path}) is not valid JSON: {e}")


class TestNoNocoDBReferences(unittest.TestCase):
    """Ensure all NocoDB references have been removed."""

    def _check_no_nocodb(self, name, path):
        with open(path, "r") as f:
            content = f.read().lower()
        nocodb_terms = ["nocodb", "nocodb_url", "nocodb_token", "nocodb_base_id",
                        "localhost:8080", "xc-token", "YOUR_NOCODB"]
        for term in nocodb_terms:
            self.assertNotIn(
                term.lower(), content,
                f"{name} still contains NocoDB reference: '{term}'"
            )

    def test_setup_no_nocodb(self):
        self._check_no_nocodb("setup", FILES["setup"])

    def test_electronics_no_nocodb(self):
        self._check_no_nocodb("electronics", FILES["electronics"])

    def test_outreach_no_nocodb(self):
        self._check_no_nocodb("outreach", FILES["outreach"])

    def test_small_biz_no_nocodb(self):
        self._check_no_nocodb("small_biz", FILES["small_biz"])


class TestWorkflowStructure(unittest.TestCase):
    """Validate required top-level workflow fields."""

    def _check_structure(self, name, path):
        wf = load_workflow(path)
        required = ["name", "nodes", "connections", "active", "settings"]
        for field in required:
            self.assertIn(field, wf, f"{name} missing top-level field: {field}")
        self.assertIsInstance(wf["nodes"], list, f"{name} 'nodes' must be a list")
        self.assertGreater(len(wf["nodes"]), 0, f"{name} has no nodes")
        self.assertIsInstance(wf["connections"], dict, f"{name} 'connections' must be a dict")

    def test_setup_structure(self):
        self._check_structure("setup", FILES["setup"])

    def test_electronics_structure(self):
        self._check_structure("electronics", FILES["electronics"])

    def test_outreach_structure(self):
        self._check_structure("outreach", FILES["outreach"])

    def test_small_biz_structure(self):
        self._check_structure("small_biz", FILES["small_biz"])


class TestNodeIntegrity(unittest.TestCase):
    """Validate node structure: IDs, names, types, positions."""

    def _check_nodes(self, name, path):
        wf = load_workflow(path)
        ids = set()
        names = set()
        for node in wf["nodes"]:
            self.assertIn("id", node, f"{name}: node missing 'id'")
            self.assertIn("name", node, f"{name}: node missing 'name'")
            self.assertIn("type", node, f"{name}: node missing 'type'")
            self.assertIn("position", node, f"{name}: node '{node.get('name')}' missing 'position'")
            self.assertNotIn(node["id"], ids, f"{name}: duplicate node id {node['id']}")
            self.assertNotIn(node["name"], names, f"{name}: duplicate node name '{node['name']}'")
            ids.add(node["id"])
            names.add(node["name"])

    def test_setup_nodes(self):
        self._check_nodes("setup", FILES["setup"])

    def test_electronics_nodes(self):
        self._check_nodes("electronics", FILES["electronics"])

    def test_outreach_nodes(self):
        self._check_nodes("outreach", FILES["outreach"])

    def test_small_biz_nodes(self):
        self._check_nodes("small_biz", FILES["small_biz"])


class TestConnectionsValid(unittest.TestCase):
    """Every connection must reference an existing node name."""

    def _check_connections(self, name, path):
        wf = load_workflow(path)
        node_names = {n["name"] for n in wf["nodes"]}

        # Check source nodes in connections exist
        for src_node in wf["connections"]:
            self.assertIn(src_node, node_names,
                          f"{name}: connection source '{src_node}' not found in nodes")

        # Check target nodes in connections exist
        for src_node, outputs in wf["connections"].items():
            if "main" in outputs:
                for output_idx, connections in enumerate(outputs["main"]):
                    for conn in connections:
                        target = conn.get("node")
                        self.assertIn(target, node_names,
                                      f"{name}: '{src_node}' connects to non-existent '{target}'")

    def test_setup_connections(self):
        self._check_connections("setup", FILES["setup"])

    def test_electronics_connections(self):
        self._check_connections("electronics", FILES["electronics"])

    def test_outreach_connections(self):
        self._check_connections("outreach", FILES["outreach"])

    def test_small_biz_connections(self):
        self._check_connections("small_biz", FILES["small_biz"])


class TestAllNodesConnected(unittest.TestCase):
    """Every non-trigger node should be a target of at least one connection."""

    def _get_trigger_types(self):
        return {"n8n-nodes-base.manualTrigger", "n8n-nodes-base.scheduleTrigger",
                "n8n-nodes-base.webhook"}

    def _check_all_connected(self, name, path):
        wf = load_workflow(path)
        trigger_types = self._get_trigger_types()
        all_targets = set()

        for src_node, outputs in wf["connections"].items():
            if "main" in outputs:
                for connections in outputs["main"]:
                    for conn in connections:
                        all_targets.add(conn.get("node"))

        for node in wf["nodes"]:
            if node["type"] in trigger_types:
                continue
            self.assertIn(node["name"], all_targets,
                          f"{name}: node '{node['name']}' is orphaned (not connected as target)")

    def test_setup_connected(self):
        self._check_all_connected("setup", FILES["setup"])

    def test_electronics_connected(self):
        self._check_all_connected("electronics", FILES["electronics"])

    def test_outreach_connected(self):
        self._check_all_connected("outreach", FILES["outreach"])

    def test_small_biz_connected(self):
        self._check_all_connected("small_biz", FILES["small_biz"])


class TestGoogleSheetURLSet(unittest.TestCase):
    """Google Sheet URL must be set (not placeholder) in all Google Sheets nodes."""

    def _check_urls(self, name, path):
        wf = load_workflow(path)
        for node in wf["nodes"]:
            if node["type"] == "n8n-nodes-base.googleSheets":
                doc_id = node.get("parameters", {}).get("documentId", {})
                url = doc_id.get("value", "")
                self.assertNotIn("YOUR_GOOGLE", url,
                                 f"{name}: node '{node['name']}' still has placeholder URL")
                self.assertIn(EXPECTED_SPREADSHEET_ID, url,
                              f"{name}: node '{node['name']}' missing correct spreadsheet ID")

    def test_electronics_urls(self):
        self._check_urls("electronics", FILES["electronics"])

    def test_outreach_urls(self):
        self._check_urls("outreach", FILES["outreach"])

    def test_small_biz_urls(self):
        self._check_urls("small_biz", FILES["small_biz"])


class TestSetupSpreadsheetID(unittest.TestCase):
    """Setup workflow must have the correct spreadsheet ID."""

    def test_spreadsheet_id_set(self):
        wf = load_workflow(FILES["setup"])
        content = json.dumps(wf)
        self.assertIn(EXPECTED_SPREADSHEET_ID, content,
                       "Setup workflow missing spreadsheet ID")
        self.assertNotIn("YOUR_GOOGLE_SPREADSHEET_ID", content,
                          "Setup workflow still has placeholder spreadsheet ID")


class TestSetupHeaderNodes(unittest.TestCase):
    """Setup workflow must write headers for all 3 sheet tabs."""

    def test_all_tabs_have_header_nodes(self):
        wf = load_workflow(FILES["setup"])
        content = json.dumps(wf)
        for tab in SHEET_TABS:
            self.assertIn(tab, content,
                          f"Setup workflow missing header node for tab '{tab}'")

    def test_electronics_headers_complete(self):
        wf = load_workflow(FILES["setup"])
        content = json.dumps(wf)
        expected_cols = ["lead_id", "source", "platform_post_id", "seller_name",
                         "device_type", "listing_title", "listing_price",
                         "status", "scraped_at"]
        for col in expected_cols:
            self.assertIn(col, content, f"Setup missing Electronics column: {col}")

    def test_outreach_headers_complete(self):
        wf = load_workflow(FILES["setup"])
        content = json.dumps(wf)
        expected_cols = ["lead_id", "lead_type", "outreach_type", "message_draft",
                         "message_sent", "next_action", "created_at"]
        for col in expected_cols:
            self.assertIn(col, content, f"Setup missing Outreach column: {col}")

    def test_small_biz_headers_complete(self):
        wf = load_workflow(FILES["setup"])
        content = json.dumps(wf)
        expected_cols = ["lead_id", "business_name", "owner_name", "business_type",
                         "ai_opportunity_score", "ai_use_cases", "status", "scraped_at"]
        for col in expected_cols:
            self.assertIn(col, content, f"Setup missing Small Biz column: {col}")


class TestGoogleSheetsNodeConfig(unittest.TestCase):
    """Validate Google Sheets node parameters are properly configured."""

    def _get_gs_nodes(self, path):
        wf = load_workflow(path)
        return [n for n in wf["nodes"] if n["type"] == "n8n-nodes-base.googleSheets"]

    def test_all_gs_nodes_have_operation(self):
        for name, path in FILES.items():
            for node in self._get_gs_nodes(path):
                params = node.get("parameters", {})
                op = params.get("operation", "read")
                self.assertIn(op, ["read", "append", "update", "delete", "clear"],
                              f"{name}: node '{node['name']}' has invalid operation '{op}'")

    def test_all_gs_nodes_have_sheet_name(self):
        for name, path in FILES.items():
            for node in self._get_gs_nodes(path):
                params = node.get("parameters", {})
                sheet = params.get("sheetName", {})
                value = sheet.get("value", "")
                self.assertIn(value, SHEET_TABS,
                              f"{name}: node '{node['name']}' has unexpected sheet '{value}'")

    def test_all_gs_nodes_have_credentials(self):
        for name, path in FILES.items():
            for node in self._get_gs_nodes(path):
                creds = node.get("credentials", {})
                self.assertIn("googleSheetsOAuth2Api", creds,
                              f"{name}: node '{node['name']}' missing Google Sheets credentials")

    def test_append_nodes_have_columns(self):
        for name, path in FILES.items():
            for node in self._get_gs_nodes(path):
                params = node.get("parameters", {})
                if params.get("operation") == "append":
                    self.assertIn("columns", params,
                                  f"{name}: append node '{node['name']}' missing columns config")

    def test_update_nodes_have_matching_columns(self):
        for name, path in FILES.items():
            for node in self._get_gs_nodes(path):
                params = node.get("parameters", {})
                if params.get("operation") == "update":
                    cols = params.get("columns", {})
                    matching = cols.get("matchingColumns", [])
                    self.assertIn("lead_id", matching,
                                  f"{name}: update node '{node['name']}' not matching on lead_id")


class TestElectronicsScraperFlow(unittest.TestCase):
    """Validate the electronics scraper has the correct flow."""

    def setUp(self):
        self.wf = load_workflow(FILES["electronics"])
        self.node_names = {n["name"] for n in self.wf["nodes"]}

    def test_has_schedule_trigger(self):
        types = {n["type"] for n in self.wf["nodes"]}
        self.assertIn("n8n-nodes-base.scheduleTrigger", types)

    def test_has_dedup_flow(self):
        expected = ["Read Existing Leads", "Filter New Leads", "Has New to Save?",
                     "Save to Google Sheets"]
        for name in expected:
            self.assertIn(name, self.node_names, f"Missing node: {name}")

    def test_has_outreach_trigger(self):
        self.assertIn("Trigger Outreach Workflow", self.node_names)

    def test_filter_code_references_deduplicate(self):
        for node in self.wf["nodes"]:
            if node["name"] == "Filter New Leads":
                code = node["parameters"]["jsCode"]
                self.assertIn("Deduplicate", code,
                              "Filter New Leads must reference Deduplicate node")
                self.assertIn("platform_post_id", code,
                              "Filter must check platform_post_id for dedup")


class TestOutreachPipelineFlow(unittest.TestCase):
    """Validate the outreach pipeline has correct flow."""

    def setUp(self):
        self.wf = load_workflow(FILES["outreach"])
        self.node_names = {n["name"] for n in self.wf["nodes"]}

    def test_has_both_webhooks(self):
        self.assertIn("New Lead Webhook", self.node_names)
        self.assertIn("Response Webhook", self.node_names)

    def test_has_lead_lookup_nodes(self):
        self.assertIn("Read Electronics Sheet", self.node_names)
        self.assertIn("Find Lead", self.node_names)
        self.assertIn("Read Electronics Sheet (Response)", self.node_names)
        self.assertIn("Find Lead for Response", self.node_names)

    def test_has_save_draft_nodes(self):
        self.assertIn("Save Repair Offer Draft", self.node_names)

    def test_no_buy_offer_nodes(self):
        """Buy offer flow was removed - verify it's gone."""
        self.assertNotIn("Generate Buy Offer", self.node_names)
        self.assertNotIn("Save Buy Offer Draft", self.node_names)
        self.assertNotIn("Update Lead - Buy Offered", self.node_names)
        self.assertNotIn("Respond Success (Buy)", self.node_names)
        self.assertNotIn("Repair Declined?", self.node_names)

    def test_has_update_status_nodes(self):
        self.assertIn("Update Lead Status - Contacted", self.node_names)
        self.assertIn("Update Lead Status", self.node_names)

    def test_has_response_nodes(self):
        self.assertIn("Respond Success (Repair)", self.node_names)
        self.assertIn("Respond Success (Response)", self.node_names)

    def test_handle_response_covers_all_types(self):
        """Handle Response node should handle accepted, declined, and no_response."""
        for node in self.wf["nodes"]:
            if node["name"] == "Handle Response":
                code = node["parameters"]["jsCode"]
                self.assertIn("accepted", code)
                self.assertIn("declined", code)
                self.assertIn("no_response", code)

    def test_find_lead_code_references_webhook(self):
        for node in self.wf["nodes"]:
            if node["name"] == "Find Lead":
                code = node["parameters"]["jsCode"]
                self.assertIn("New Lead Webhook", code)
                self.assertIn("lead_id", code)

    def test_find_lead_response_code_references_webhook(self):
        for node in self.wf["nodes"]:
            if node["name"] == "Find Lead for Response":
                code = node["parameters"]["jsCode"]
                self.assertIn("Response Webhook", code)
                self.assertIn("lead_id", code)

    def test_parse_response_uses_direct_lead_data(self):
        """Ensure Parse Response accesses lead data directly, not via list."""
        for node in self.wf["nodes"]:
            if node["name"] == "Parse Response":
                code = node["parameters"]["jsCode"]
                self.assertNotIn("list?.[0]", code,
                                 "Parse Response should not use NocoDB list pattern")

    def test_generate_repair_uses_direct_lead_data(self):
        """Ensure Generate Repair Offer accesses lead data directly."""
        for node in self.wf["nodes"]:
            if node["name"] == "Generate Repair Offer":
                code = node["parameters"]["jsCode"]
                self.assertNotIn("list?.[0]", code,
                                 "Generate Repair Offer should not use NocoDB list pattern")


class TestSmallBizScraperFlow(unittest.TestCase):
    """Validate small business scraper flow."""

    def setUp(self):
        self.wf = load_workflow(FILES["small_biz"])
        self.node_names = {n["name"] for n in self.wf["nodes"]}

    def test_has_schedule_trigger(self):
        types = {n["type"] for n in self.wf["nodes"]}
        self.assertIn("n8n-nodes-base.scheduleTrigger", types)

    def test_has_dedup_flow(self):
        expected = ["Read Existing Leads", "Filter New Leads", "Has New to Save?",
                     "Save to Google Sheets"]
        for name in expected:
            self.assertIn(name, self.node_names, f"Missing node: {name}")

    def test_has_outreach_draft(self):
        self.assertIn("Save Outreach Draft", self.node_names)

    def test_filter_uses_owner_profile_url(self):
        for node in self.wf["nodes"]:
            if node["name"] == "Filter New Leads":
                code = node["parameters"]["jsCode"]
                self.assertIn("owner_profile_url", code,
                              "Small biz filter must dedup on owner_profile_url")

    def test_outreach_draft_goes_to_outreach_log(self):
        for node in self.wf["nodes"]:
            if node["name"] == "Save Outreach Draft":
                sheet = node["parameters"].get("sheetName", {}).get("value", "")
                self.assertEqual(sheet, "Outreach Log")


class TestNoPlaceholdersRemain(unittest.TestCase):
    """No YOUR_ placeholders should remain except credential IDs."""

    def test_no_api_token_placeholders(self):
        allowed = ["YOUR_APIFY_API_TOKEN", "YOUR_GOOGLE_SHEETS_CREDENTIAL_ID",
                    "YOUR_LOCAL_MARKETPLACE_GROUP", "YOUR_LOCAL_ELECTRONICS_GROUP",
                    "YOUR_LOCAL_BUSINESS_GROUP", "YOUR_LOCAL_ENTREPRENEUR_GROUP",
                    "YOUR_LOCAL_NETWORKING_GROUP"]
        for name, path in FILES.items():
            with open(path, "r") as f:
                content = f.read()
            # Find all YOUR_ occurrences
            import re
            matches = re.findall(r"YOUR_\w+", content)
            for match in matches:
                is_allowed = any(match.startswith(a.replace("_1", "").replace("_2", ""))
                                 for a in allowed)
                if not is_allowed:
                    self.fail(f"{name}: unexpected placeholder '{match}' in {path}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
