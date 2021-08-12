import { addon } from ".."
import extractFileIcon from "extract-file-icon"
import { Monitor } from "./monitor"
import { IRectangle } from "../interfaces"
import { EmptyMonitor } from "./empty-monitor"
import isEmpty from "lodash/isEmpty"

export class Window {
  public id: number

  public processId: number
  public layer: number
  public path: string
  public bundleId: string
  public initialTitle: string

  constructor(id: number) {
    if (!addon) {
      throw new Error("Cannot load window manager addon")
    }

    this.id = id
    const { processId, path, bundleId, layer, name } = addon.initWindow(id)
    this.processId = processId
    this.path = path
    this.bundleId = bundleId
    this.layer = layer
    this.initialTitle = name
  }

  getBounds(): IRectangle {
    const bounds = addon.getWindowBounds(this.id)

    if (process.platform === "win32") {
      const sf = this.getMonitor().getScaleFactor()

      bounds.x = Math.floor(bounds.x / sf)
      bounds.y = Math.floor(bounds.y / sf)
      bounds.width = Math.floor(bounds.width / sf)
      bounds.height = Math.floor(bounds.height / sf)
    }

    return bounds
  }

  setBounds(bounds: IRectangle) {
    const newBounds = { ...this.getBounds(), ...bounds }

    if (process.platform === "win32") {
      const sf = this.getMonitor().getScaleFactor()

      newBounds.x = Math.floor(newBounds.x * sf)
      newBounds.y = Math.floor(newBounds.y * sf)
      newBounds.width = Math.floor(newBounds.width * sf)
      newBounds.height = Math.floor(newBounds.height * sf)

      addon.setWindowBounds(this.id, newBounds)
    } else if (process.platform === "darwin") {
      addon.setWindowBounds(this.id, newBounds)
    }
  }

  getTitle(): string {
    return addon.getWindowTitle(this.id)
  }

  getMonitor(): Monitor | EmptyMonitor {
    if (!addon.getMonitorFromWindow) return new EmptyMonitor()
    return new Monitor(addon.getMonitorFromWindow(this.id))
  }

  show() {
    if (!addon.showWindow) return
    addon.showWindow(this.id, "show")
  }

  hide() {
    if (!addon.showWindow) return
    addon.showWindow(this.id, "hide")
  }

  minimize() {
    if (process.platform === "win32") {
      addon.showWindow(this.id, "minimize")
    } else if (process.platform === "darwin") {
      addon.setWindowMinimized(this.id, true)
    }
  }

  restore() {
    if (process.platform === "win32") {
      addon.showWindow(this.id, "restore")
    } else if (process.platform === "darwin") {
      addon.setWindowMinimized(this.id, false)
    }
  }

  maximize() {
    if (process.platform === "win32") {
      addon.showWindow(this.id, "maximize")
    } else if (process.platform === "darwin") {
      addon.setWindowMaximized(this.id)
    }
  }

  bringToTop() {
    if (process.platform === "darwin") {
      addon.bringWindowToTop(this.id, this.processId)
    } else {
      addon.bringWindowToTop(this.id)
    }
  }

  redraw() {
    if (!addon.redrawWindow) return
    addon.redrawWindow(this.id)
  }

  isWindow(): boolean {
    if (!addon) return

    if (process.platform === "win32") {
      return this.path && this.path !== "" && addon.isWindow(this.id)
    } else if (process.platform === "darwin") {
      return this.path && this.path !== "" && !!addon.initWindow(this.id)
    }
  }

  isVisible(): boolean {
    if (!addon.isWindowVisible) {
      return true
    }
    return addon.isWindowVisible(this.id)
  }

  toggleTransparency(toggle: boolean) {
    if (!addon.toggleWindowTransparency) return
    addon.toggleWindowTransparency(this.id, toggle)
  }

  setOpacity(opacity: number) {
    if (!addon.setWindowOpacity) return
    addon.setWindowOpacity(this.id, opacity)
  }

  getOpacity() {
    if (!addon.getWindowOpacity) return 1
    return addon.getWindowOpacity(this.id)
  }

  getIcon(size: 16 | 32 | 64 | 256 = 64) {
    return extractFileIcon(this.path, size)
  }

  setOwner(window: Window | null | number) {
    if (!addon.setWindowOwner) return

    let handle = window

    if (window instanceof Window) {
      handle = window.id
    } else if (!window) {
      handle = 0
    }

    addon.setWindowOwner(this.id, handle)
  }

  getOwner() {
    if (!addon.getWindowOwner) return
    return new Window(addon.getWindowOwner(this.id))
  }
}
