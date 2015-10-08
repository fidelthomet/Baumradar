function initLocation(resolve, reject) {
	if ("geolocation" in navigator) {
		navigator.geolocation.watchPosition(function(position) {

			state.user.location = [position.coords.longitude, position.coords.latitude]
			state.geolocation = true

			if (state.ready) {
				if (state.watchposition) {
					panTo(state.user.location)
				}

				updateUser()
				updateDirection()
			}

			resolve()
		}, function(error) {
			resolve()
		})
	} else {
		resolve()

	}

	if (window.DeviceOrientationEvent) {
		window.addEventListener('deviceorientation', function(eventData) {

			var heading
			if (event.webkitCompassHeading) {
				if (!state.compass) {
					state.compass = true
					if (features.user) {
						features.user.setStyle(new ol.style.Style({
							image: new ol.style.Icon(({
								src: 'svg/user-dir-accent.svg',
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