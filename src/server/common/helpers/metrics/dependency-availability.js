import { NONE, publishMetricsInBackground } from './publish-metrics.js'

const PUBLISH_EVERY_MS = 60_000

const lastCallSucceededByDependency = new Map()
let availabilityPublishTimer

/**
 * Publishes `external.dependency.available` tagged `dependency`: 1 when the
 * dependency is available, 0 when it is not.
 *
 * @param {string} dependency - the dependency, as the metric contract names it
 * @param {boolean} available - whether it is available
 */
export const publishDependencyAvailabilityInBackground = (
  dependency,
  available
) =>
  publishMetricsInBackground({ dependency }, [
    {
      name: 'external.dependency.available',
      value: available ? 1 : 0,
      unit: NONE
    }
  ])

const publishEachCalledDependency = () => {
  for (const [dependency, succeeded] of lastCallSucceededByDependency) {
    publishDependencyAvailabilityInBackground(dependency, succeeded)
  }
}

/**
 * Keeps the outcome of a dependency's most recent call as its availability,
 * and every minute publishes the availability of each dependency called so
 * far: 1 after a call that succeeded, 0 after one that failed. A dependency
 * not yet called publishes nothing.
 *
 * @param {string} dependency - the dependency called
 * @param {boolean} failed - whether the call failed
 */
export const recordDependencyCallOutcome = (dependency, failed) => {
  lastCallSucceededByDependency.set(dependency, !failed)
  availabilityPublishTimer ??= setInterval(
    publishEachCalledDependency,
    PUBLISH_EVERY_MS
  ).unref()
}
