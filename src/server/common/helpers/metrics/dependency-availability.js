import { NONE, publishMetricsInBackground } from './publish-metrics.js'

const PUBLISH_EVERY_MS = 60_000

const latestAvailabilityByDependency = new Map()
let availabilityPublishTimer

/**
 * Publishes `external.dependency.available` tagged `dependency`: 1 when the
 * dependency is available, 0 when it is not.
 *
 * @param {{ dependency: string, available: boolean }} availability - the dependency, as the metric contract names it, and whether it is available
 */
export const publishDependencyAvailabilityInBackground = ({
  dependency,
  available
}) =>
  publishMetricsInBackground({ dependency }, [
    {
      name: 'external.dependency.available',
      value: available ? 1 : 0,
      unit: NONE
    }
  ])

const publishEachCalledDependency = () => {
  for (const [dependency, available] of latestAvailabilityByDependency) {
    publishDependencyAvailabilityInBackground({ dependency, available })
  }
}

/**
 * Keeps the outcome of a dependency's most recent call as its availability,
 * and every minute publishes the availability of each dependency called so
 * far: 1 after a call that succeeded, 0 after one that failed. A dependency
 * not yet called publishes nothing.
 *
 * @param {{ dependency: string, available: boolean }} availability - the dependency called, and whether its call succeeded
 */
export const recordDependencyCallOutcome = ({ dependency, available }) => {
  latestAvailabilityByDependency.set(dependency, available)
  availabilityPublishTimer ??= setInterval(
    publishEachCalledDependency,
    PUBLISH_EVERY_MS
  ).unref()
}
