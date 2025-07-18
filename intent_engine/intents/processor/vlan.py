def process_vlan_intent(intent):
    payload = {
        "vlan-service": {
            "vlan-id": intent["vlan_id"],
            "name": intent["name"],
            "site": intent["site"]
        }
    }
    return {"payload": payload, "status": "ready to push to NSO"}
