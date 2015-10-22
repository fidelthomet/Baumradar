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
			all: {
				files: {
					'build/scripts/magic.js': ['src/scripts/magic.js'],
					'build/scripts/donut.js': ['src/scripts/donut.js', 'src/scripts/polygons.js'],
					'build/scripts/map.js': ['src/scripts/map.js'],
					'build/scripts/countries.js': ['src/scripts/countries.js']
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
					'build/index.html': 'src/index.html',
					'build/svg/select.svg': 'src/svg/select.svg'
					// 'build/map/map.html': 'src/map/map.html'
				}
			}
		},

		compass: {
			dist: {
				options: {
					sassDir: 'src/sass',
					cssDir: 'build/style',
					environment: 'production'
				}
			},
		},

		autoprefixer: {
			all: {
				src: 'build/style/glitter.css',
			},
		}

	});

	grunt.loadNpmTasks('grunt-contrib-watch');

	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-compass');
	grunt.loadNpmTasks('grunt-contrib-htmlmin');
	grunt.loadNpmTasks('grunt-autoprefixer');

	grunt.registerTask('default', ['uglify', "compass", "htmlmin", "autoprefixer"]);
	grunt.registerTask('start', ['uglify', "compass", "htmlmin", "autoprefixer", "watch"]);
};