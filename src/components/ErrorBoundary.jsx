import { Component } from 'react'

// Shows `fallback` instead of the children when they throw while rendering, so one broken part
// doesn't blank the whole page. onError hears about it, to log it or switch to something else.
export default class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error, info) {
    this.props.onError?.(error, info)
  }

  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children
  }
}
