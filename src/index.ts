import { Window } from "./classes/window"
import { EventEmitter } from "events"
import { platform } from "os"
import { Monitor } from "./classes/monitor"
import { EmptyMonitor } from "./classes/empty-monitor"
import { resolve } from "path"
import isEqual from "lodash/isEqual"
import each from "lodash/each"
import isEmpty from "lodash/isEmpty"
import { IRectangle } from "./interfaces"

let addon: any

if (platform() === "win32" || platform() === "darwin") {
  const ADDON_PATH =
    process.env.NODE_ENV != "dev" && process.env.NODE_ENV != "development"
      ? "Release"
      : "Debug"

  addon = require(`node-gyp-build`)(resolve(__dirname, ".."))
}

type WindowId = number

class WindowManager extends EventEmitter {
  private lastActivatedId: number
  private lastPositioningMap: Record<WindowId, IRectangle> = {}
  private lastVisibilityMap: Record<WindowId, boolean> = {}
  private windows: Record<WindowId, Window> = {}
  private mainInterval: ReturnType<typeof setInterval>

  constructor() {
    super()

    if (!addon) {
      throw new Error("Cannot load window manager addon")
    }

    this.on("newListener", () => {
      if (this.mainInterval) {
        return
      }
      this.lastActivatedId = addon.getActiveWindow()
      this.mainInterval = setInterval(this.monitorChanges.bind(this), 50)
    })
  }

  public stopMonitoring() {
    clearInterval(this.mainInterval)
  }

  protected monitorChanges() {
    const id = addon.getActiveWindow()

    if (!id) {
      return
    }

    // new window
    if (!this.windows[id]) {
      this.windows[id] = new Window(id)
      this.emit("new-window", this.windows[id])
    }

    if (this.lastActivatedId && this.lastActivatedId !== id) {
      this.emit("window-activated", this.windows[id])
    }
    this.lastActivatedId = id

    // this.analysePositioning(id)
    // this.analyseVisibility(id)

    each(this.windows, (win, winId) => {
      // if (id !== winId) {
      this.analysePositioning(+winId)
      this.analyseVisibility(+winId)
      // }
    })
  }

  protected analysePositioning(id: number) {
    if (
      this.lastPositioningMap[id] &&
      !isEmpty(this.windows[id].getBounds()) &&
      false ===
        isEqual(this.lastPositioningMap[id], this.windows[id].getBounds())
    ) {
      this.emit(
        "window-bounds-change",
        this.windows[id],
        this.windows[id].getBounds()
      )
    }
    this.lastPositioningMap[id] = this.windows[id].getBounds()
  }

  protected analyseVisibility(id: number) {
    if (
      this.lastVisibilityMap[id] !== undefined &&
      this.lastVisibilityMap[id] !== this.windows[id].isVisible()
    ) {
      this.emit(
        "window-visibility-change",
        this.windows[id],
        this.windows[id].isVisible()
      )
    }
    // console.log("visible", this.windows[id].isVisible())
    this.lastVisibilityMap[id] = this.windows[id].isVisible()
  }

  requestAccessibility = () => {
    if (!addon.requestAccessibility) return true
    return addon.requestAccessibility()
  }

  getActiveWindow = () => {
    return new Window(addon.getActiveWindow())
  }

  getWindows = (): Window[] => {
    return addon
      .getWindows()
      .map((win: any) => new Window(win))
      .filter((x: Window) => x.isWindow())
  }

  getMonitors = (): Monitor[] => {
    if (!addon.getMonitors) return []
    return addon.getMonitors().map((mon: any) => new Monitor(mon))
  }

  getPrimaryMonitor = (): Monitor | EmptyMonitor => {
    if (process.platform === "win32") {
      return this.getMonitors().find((x) => x.isPrimary)
    } else {
      return new EmptyMonitor()
    }
  }

  createProcess = (path: string, cmd = ""): number => {
    if (!addon.createProcess) return
    return addon.createProcess(path, cmd)
  }
}

const windowManager = new WindowManager()

export { windowManager, Window, addon }
