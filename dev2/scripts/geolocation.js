function initLocation(resolve, reject) {
	if ("geolocation" in navigator) {
		navigator.geolocation.watchPosition(function(position) {

			state.user.location = [position.coords.longitude, position.coords.latitude]
			state.geolocation = true

			if (state.ready.center) {
				if (state.watchposition) {
					centerMap(state.user.location)
				}

				updateUser()
				updateDirection()
			}

			resolve()
		})
	} else {
		resolve()
	}

	if (window.DeviceOrientationEvent) {
		window.addEventListener('deviceorientation', function(eventData) {

			var heading
			if (event.webkitCompassHeading)
				heading = event.webkitCompassHeading
			else
				heading = event.alpha

			if (heading != state.user.heading) {
				state.user.heading = heading
				// $(".dir").css("transform", "rotate(" + -state.user.heading + "deg)")

				if (state.ready.center) {
					updateUser()
					updateDirection()
				}
			}
		})
	}
}