# Turbo

Turbo uses complementary techniques to dramatically reduce the amount of custom JavaScript that most web applications will need to write:

* Turbo Drive accelerates links and form submissions by negating the need for full page reloads.
* Turbo Frames decompose pages into independent contexts, which scope navigation and can be lazily loaded.
* Turbo Streams deliver page changes over WebSocket or in response to form submissions using just HTML and a set of CRUD-like actions.
* Turbo Native lets your majestic monolith form the center of your native iOS and Android apps, with seamless transitions between web and native sections.

It's all done by sending HTML over the wire. And for those instances when that's not enough, you can reach for the other side of Hotwire, and finish the job with [Stimulus](https://github.com/hotwired/stimulus).

Read more on [turbo.hotwired.dev](https://turbo.hotwired.dev).

## Hover prefetching

Hover prefetching is opt-in per link. Add `data-turbo-prefetch` to fetch a link after it has been hovered for 100 milliseconds:

```html
<a href="/messages" data-turbo-prefetch>Messages</a>
```

Use `data-turbo-prefetch-delay` to override the delay in milliseconds. Invalid or empty values use the 100 millisecond default:

```html
<a href="/messages" data-turbo-prefetch data-turbo-prefetch-delay="250">Messages</a>
```

Prefetching resolves `data-turbo-frame`, the closest frame's `target`, or the closest frame's `id` and sends the corresponding `Turbo-Frame` request header. A `_top` target remains a full-page request. Unsafe, cross-origin, same-page, Turbo Stream, UJS, confirmation, targeted, and download links are not prefetched. Prevent `turbo:before-prefetch` to apply additional application-specific exclusions.

Turbo dispatches lifecycle events that can be counted to calculate prefetch effectiveness:

* `turbo:prefetch-start` when the delayed request starts
* `turbo:prefetch-hit` when navigation reuses that request
* `turbo:prefetch-waste` when a started request is discarded, with a `reason` in `event.detail`

Each lifecycle event includes the same `id`, plus `url`, resolved `frame`, and configured `delay`. Hit and waste events also include `duration` in milliseconds. A hover canceled before its delay does not emit a start or waste event. Calculate hit rate as hit events divided by start events, and waste rate as waste events divided by start events.

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md).

© 2021 37signals LLC.
