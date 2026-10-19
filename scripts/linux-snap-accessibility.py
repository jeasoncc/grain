#!/usr/bin/python3
"""Drive the installed GTK/WebKit application through its real AT-SPI tree."""
import json
import sys
import time

import pyatspi

# Each invocation is also bounded by the Node owner; do not hang on dead D-Bus peers.
pyatspi.setTimeout(1500, 1500)
action, argument = sys.argv[1:3]
errors = []


def record_error(error):
    message = str(error)
    if len(errors) < 32 and message not in errors:
        errors.append(message)


def descendants(root):
    pending = [(root, 0)]
    count = 0
    while pending:
        node, depth = pending.pop()
        count += 1
        if count > 12000 or depth > 100:
            raise RuntimeError("AT-SPI tree exceeds the supported traversal bound")
        yield node
        try:
            pending.extend((node[i], depth + 1) for i in reversed(range(node.childCount)))
        except Exception as error:
            record_error(error)
            continue


def app_nodes():
    desktop = pyatspi.Registry.getDesktop(0)
    for app in desktop:
        for window in list(app):
            try:
                title = window.name
                supported = action == "dump" or title == "选择 Org 工作区"
                if supported and window.getState().contains(pyatspi.STATE_SHOWING):
                    yield from descendants(window)
            except Exception as error:
                record_error(error)
                continue


def describe(node):
    result = {"role": node.getRoleName(), "name": node.name,
              "states": [str(state) for state in node.getState().getStates()],
              "children": node.childCount}
    try:
        text = node.queryText()
        result["text"] = text.getText(0, min(text.characterCount, 20000))
    except Exception:
        pass
    return result


deadline = time.monotonic() + (1 if action == "dump" else 40)
last = []
while time.monotonic() < deadline:
    last = []
    for node in app_nodes():
        try:
            description = describe(node)
            last.append(description)
            showing = node.getState().contains(pyatspi.STATE_SHOWING)
            if action == "chooser-ready" and node.name == "选择 Org 工作区" and showing:
                print(json.dumps({"action": action, **description}, ensure_ascii=False))
                sys.exit(0)
            if action == "chooser-point" and node.name == argument and showing:
                rect = node.queryComponent().getExtents(pyatspi.DESKTOP_COORDS)
                if rect.width <= 0 or rect.height <= 0:
                    continue
                print(json.dumps({"action": action, **description,
                                  "x": rect.x + rect.width // 2,
                                  "y": rect.y + rect.height // 2}, ensure_ascii=False))
                sys.exit(0)
            if action == "chooser-click" and node.name == argument and showing:
                if not node.getState().contains(pyatspi.STATE_ENABLED):
                    continue
                interface = node.queryAction()
                for index in range(interface.nActions):
                    if interface.getName(index).lower() in ("click", "press", "activate"):
                        if not interface.doAction(index):
                            raise RuntimeError("Native accessible action was rejected")
                        print(json.dumps({"action": action, **description}, ensure_ascii=False))
                        sys.exit(0)
        except Exception as error:
            record_error(error)
            continue
    if action == "dump":
        print(json.dumps({"nodes": last, "errors": errors}, ensure_ascii=False, indent=2))
        sys.exit(0)
    time.sleep(0.25)
print(json.dumps({"error": "No supported visible native accessible target", "action": action,
                  "argument": argument, "tree": last, "errors": errors}, ensure_ascii=False, indent=2))
sys.exit(1)
