export interface UserLocation {
  lat: number
  lng: number
}

export function getUserLocation(): Promise<UserLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      // Fallback to Stanford campus center if geolocation is not supported
      resolve({ lat: 37.4275, lng: -122.1697 })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
      },
      (error) => {
        console.warn('Geolocation error:', error.message)
        // Fallback to Stanford campus center on error
        resolve({ lat: 37.4275, lng: -122.1697 })
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    )
  })
} 