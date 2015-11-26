// --
// initLocation
// --
// do all the stuff that is related to geolocation and orientation
// --
function initLocation(resolve, reject) {
	if ("geolocation" in navigator) {
		// use watchposition to detect if user moves around
		navigator.geolocation.watchPosition(function(position) {

			state.user.location = [position.coords.longitude, position.coords.latitude]
			state.geolocation = true

			// update user
			if (state.ready) {
				if (state.watchposition) {
					panTo(state.user.location)
				}

				updateUser()
				updateDirection()
			}

			resolve()
		}, function(error) {
			goToFail('Ihr aktueller Aufenthaltsort konnte nicht ermittelt werden')
			localStorage.removeItem("geo")
			resolve()
		})
	} else {
		goToFail('Ihr aktueller Aufenthaltsort konnte nicht ermittelt werden')
		localStorage.removeItem("geo")
		resolve()

	}

	// look for compass heading and do related stuff
	if (window.DeviceOrientationEvent) {
		window.addEventListener('deviceorientation', function(eventData) {

			var heading
			if (event.webkitCompassHeading) {
				if (!state.compass) {
					state.compass = true
					if (features.user) {
						features.user.setStyle(new ol.style.Style({
							image: new ol.style.Icon(({
								src: 'icons/user-dir-accent.svg',
								size: [40, 40]
							}))
						}))
					}
				}
				heading = event.webkitCompassHeading

				if (heading != state.user.heading) {
					state.user.heading = heading
						// $(".dir").css("transform", "rotate(" + -state.user.heading + "deg)")

					if (state.ready) {
						updateUser()
						updateDirection()
					}
				}
			}
		})
	}
}