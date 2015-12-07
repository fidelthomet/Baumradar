module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		watch: {
			scripts: {
				files: ['dev/**/*'],
				tasks: ['default']
			}
		},

		uglify: {
			// options: {
   //    			mangle: false
   //  		}, 
			my_target: {
				files: {
					'build/scripts/main.js': ['dev/scripts/main.js', 'dev/scripts/map.js', 'dev/scripts/requests.js', 'dev/scripts/geolocation.js', 'dev/scripts/details.js', 'dev/scripts/overview.js', 'dev/scripts/search.js', 'dev/scripts/helper.js'],
					// 'build/libs/libs.js': ['dev/libs/ol.js','dev/libs/proj4.js','dev/libs/21781.js','dev/libs/jquery-2.1.4.min.js','dev/libs/es6-promise.min.js','dev/libs/nprogress.js']
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
					'build/index.html': 'dev/index.html'
				}
			}
		},

		compass: {
			dist: {
				options: {
					sassDir: 'dev/scss',
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
						src: ['dev/icons/*'],
						dest: 'build/icons',
						filter: 'isFile'
					},
					{
						expand: true,
						flatten: true,
						src: ['dev/data/*'],
						dest: 'build/data',
						filter: 'isFile'
					},
					{
						expand: true,
						flatten: true,
						src: ['dev/css/*'],
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