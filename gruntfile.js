module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		watch: {
			scripts: {
				files: ['src/**/*'],
				tasks: ['default']
			}
		},

		uglify: {
			// options: {
   //    			mangle: false
   //  		}, 
			my_target: {
				files: {
					'build/scripts/main.js': ['dev2/scripts/main.js', 'dev2/scripts/map.js', 'dev2/scripts/requests.js', 'dev2/scripts/geolocation.js', 'dev2/scripts/details.js', 'dev2/scripts/overview.js', 'dev2/scripts/search.js', 'dev2/scripts/helper.js'],
					'build/libs/libs.js': ['libs/ol.js','libs/proj4.js','libs/21781.js','libs/jquery-2.1.4.min.js','libs/es6-promise.min.js','libs/nprogress.js']
				}
			}
		},

		htmlmin: {
			dist: {
				options: {
					removeComments: true,
					collapseWhitespace: true
				},
				files: {
					'build/index.html': 'dev2/index.html'
				}
			}
		},

		compass: {
			dist: {
				options: {
					sassDir: 'dev2/scss',
					cssDir: 'build/css',
					environment: 'production'
				}
			},
		},

		autoprefixer: {
			all: {
				src: 'build/css/style.css',
			},
		},

		copy: {
			main: {
				files: [
					// includes files within path
					{
						expand: true,
						flatten: true,
						src: ['dev2/icons/*'],
						dest: 'build/icons',
						filter: 'isFile'
					},
					{
						expand: true,
						flatten: true,
						src: ['dev2/data/*'],
						dest: 'build/data',
						filter: 'isFile'
					},
					{
						expand: true,
						flatten: true,
						src: ['dev2/css/*'],
						dest: 'build/css',
						filter: 'isFile'
					}

					
				],
			},
		},

	});

	grunt.loadNpmTasks('grunt-contrib-watch');

	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-compass');
	grunt.loadNpmTasks('grunt-contrib-htmlmin');
	grunt.loadNpmTasks('grunt-autoprefixer');
	grunt.loadNpmTasks('grunt-contrib-copy');

	grunt.registerTask('default', ['uglify', "compass", "htmlmin", "autoprefixer", "copy"]);
	grunt.registerTask('start', ['uglify', "compass", "htmlmin", "autoprefixer", "watch"]);
};