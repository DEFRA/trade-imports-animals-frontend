import { NONE, publishMetricsInBackground } from './publish-metrics.js'

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

const publishEachRecordedDependency = () => {
  for (const [dependency, available] of latestAvailabilityByDependency) {
    publishDependencyAvailabilityInBackground({ dependency, available })
  }
}

/**
 * Keeps a dependency's most recently recorded availability, and every minute
 * publishes the availability kept for each dependency recorded so far. A
 * dependency not yet recorded publishes nothing.
 *
 * @param {{ dependency: string, available: boolean }} availability - the dependency, as the metric contract names it, and whether it is available
 */
export const recordDependencyAvailability = ({ dependency, available }) => {
  const publishEveryMs = 60_000
  latestAvailabilityByDependency.set(dependency, available)
  availabilityPublishTimer ??= setInterval(
    publishEachRecordedDependency,
    publishEveryMs
  ).unref()
}
