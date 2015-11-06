(function($){

		window.App = {
			Models: {},
			Collections: {
				sets: new Sets(),
				workoutExercises: new WorkoutExercises(),
				workouts: new Workouts(),
				exercises: new Exercises(),
				settings: new UserSettings(),
				routines: new Routines(),
				users: new Users()
			},
			Views: {},
			Router: {},
			Defaults: {
				exercises: [
          {name: "SQT", label: "SQUAT", defaultReps: 5, weight: 20, sets: 3, increment: 2.5},
          {name: "LSE", label: "Laura's special exercise", weight: 20, defaultReps: 5, sets: 6, increment: 2.5},
          {name: "BPR", label: "BENCH PRESS", defaultReps: 5, weight: 20, sets: 3, increment: 2.5},
          {name: "DDL", label: "DEADLIFT", defaultReps: 5, weight: 20, sets: 1, increment: 5},
          {name: "PRS", label: "PRESS", defaultReps: 5, weight: 20, sets: 3, increment: 2.5},
          {name: "PUL", label: "PULL UP", defaultReps: "Max", weight: 0, sets: 3, increment: 2.5},
          {name: "KBS", label: "KETTLEBELL SWING", defaultReps: "50", weight: 0, sets: 1,increment: 4}
        ],
				routines: [{name: "A", next: "B"}, {name: "B", next: "A"}, {name: "C"}],
				user: {name: "Paul"}
			}
		};
	
		App.index = function() {
			// // console.log("index called");
			$.when(App.fetchSets(), App.fetchWorkouts(), App.fetchExercises()).done(function index () {
				// // console.log(new HistoryPresenter({sets: App.Collections.sets}));
				// console.log(new HistoryPresenter({sets: App.Collections.sets}));
				var options = {sets: App.Collections.sets, workouts: App.Collections.workouts, exercises: App.Collections.exercises};
				$("#main").html(new HistoryListView({sets: new HistoryPresenter(options)}).render().el);
			})
		};
		
		App.init = function() {
			// // console.log("init called");
			new App.Router;
			Backbone.history.start();
			// create a default user;
			App.Collections.users.add({name: "Paul"});
			App.Collections.users.at(0).save();
		};
		
		App.clear = function() {
				localStorage.clear();
		}
		
		App.exercises = function() {
			// // console.log("exercises called");
			App.fetchExercises().then(function(){
				var c = App.Collections.exercises;
				$("#main").html(new ExerciseListView({collection: c}).render().el);
			});
		};
		
		App.fetchSets = function() {
			// // console.log("fetchSets called");
			return App.Collections.sets.fetch().done(function(data){
				if (data.length) {
					App.Collections.sets.add(data);
				}
			});
		};
		
		App.fetchExercises = function() {
			// // console.log("fetchExercises called");
			return App.Collections.exercises.fetch().done(function(data){
				if (data.length) {
					App.Collections.exercises.add(data);
				} else {
					_.forEach(App.Defaults.exercises, function(exercise){
						var m = new Exercise(exercise);
						App.Collections.exercises.add(m);
						m.save();
					});
				}
			});
		};
	
		App.settings = function() {
			// // console.log("settings called");
			App.fetchSettings().then(function(){
				var c = App.Collections.settings;
				$("#main").html(new UserSettingView({collection: c}).render().el);
				// // console.log(arguments);
			});
		};
		
		App.fetchSettings = function() {
			return App.Collections.settings.fetch().done(function(data){
				if (data.length) {
					App.Collections.settings.add(data);
				} else {
					App.Collections.settings.add(new UserSetting());
				}
			});
		};
		
		App.fetchUser = function() {
			return App.Collections.users.fetch().done(function(data){
					App.Collections.users.add(App.Defaults.user);
			});
		};
		
		App.fetchRoutines = function() {
			return App.Collections.routines.fetch().done(function(data){
				if (data.length) {
					App.Collections.routines.add(data);
				} else {
					_.forEach(App.Defaults.routines, function(routine){
						var m = new Routine(routine);
						App.Collections.routines.add(m);
						m.save();
					});
				}
			});
		};
		
		App.fetchWorkouts = function() {
			return App.Collections.workouts.fetch().done(function(data){
				if (data.length) {
					App.Collections.workouts.add(data);
				}
			});
		};
		
		App.fetchWorkoutExercises = function() {
			return App.Collections.workoutExercises.fetch().done(function(data){
				if (data.length) {
					App.Collections.workoutExercises.add(data);
				} else {
						var C = App.Collections, 
								a = C.routines.findWhere({name: "A"}).get("id"),
								b = C.routines.findWhere({name: "B"}).get("id"),
								c = C.routines.findWhere({name: "C"}).get("id");
						_.forEach([
			       	{ routineId: a, exerciseId: C.exercises.findWhere({name: "SQT"}).get("id") },
			       	{ routineId: a, exerciseId: C.exercises.findWhere({name: "BPR"}).get("id") },
			       	{ routineId: a, exerciseId: C.exercises.findWhere({name: "DDL"}).get("id") },
			       	{ routineId: b, exerciseId: C.exercises.findWhere({name: "SQT"}).get("id") },
			       	{ routineId: b, exerciseId: C.exercises.findWhere({name: "PRS"}).get("id") },
			       	{ routineId: b, exerciseId: C.exercises.findWhere({name: "PUL"}).get("id") },
			       	{ routineId: c, exerciseId: C.exercises.findWhere({name: "KBS"}).get("id") }
			    ], function(o){
						var m = new WorkoutExercise(o);
						App.Collections.workoutExercises.add(m);
						m.save();
			    });
				}
			});
		};
		
		App.nextRoutine = function(){
			App.currentRoute = (App.currentRoute ? App.Collections.routines.findWhere({name: App.currentRoute}).get("next") : "A");
			return App.currentRoute;
		}
	
		App.workout = function() {
			// bootstrap the app;
			$.when(App.fetchExercises(), App.fetchSettings(), App.fetchUser(), App.fetchRoutines()).done(function () {
				var C = App.Collections,
						now = new Date,
						sets = [],
						next = App.nextRoutine(),
						userId = C.users.at(0).get("id");
						// update exercise to new wieght;		
				
				if (!C.workoutExercises.length) {
					App.fetchWorkoutExercises();
				};				
				// create new routine (i.e individual workout) ..
				var workout = new Workout({ userId: userId, date: now, routineId: C.routines.findWhere({name: next}).get("id") });
				C.workouts.add(workout);
				workout.save();				
				// .. grab all the exercises for this new routine;
				C.workoutExercises.where({routineId: workout.get("routineId")}).forEach(function createSets (ex1) {
					var ex2 = C.exercises.where({"id": ex1.get("exerciseId")});
					for (var 	i = 0, 
										ex = ex2[0], 
										setTotal = parseInt(ex.get("sets")); i < setTotal; i++) {
						// update new wieght, but only on the first pass;
						if (i === 0) {
							// console.log(ex.get('label'), parseFloat(ex.get("weight")), parseFloat(ex.get("increment")), arguments)
							ex.set("weight", parseFloat(ex.get("weight")) + parseFloat(ex.get("increment")));
						}
						// // console.log(ex.toJSON());
						var set = new Set({exercises: App.Collections.exercises})
						set.set({
									"exerciseId": 		ex.get("id"),
									"numberOfReps": 	ex.get("defaultReps"),
									"workoutId": 			workout.get("id")});
						sets.push(set);
						//// // console.log(ex2[0].toJSON(), set.toJSON());
					}
				});
				C.sets.add(sets);
				var c = new WorkoutPresenter({sets: sets, exercises: C.exercises, settings: C.settings.at(0)});
	      $("#main").html(new WorkoutView({collection: c}).render().el);
			});
		};
	
		App.Router = Backbone.Router.extend({
			routes: {
				'': App.index,
				'exercises': App.exercises,
				'settings': App.settings,
				'workout': App.workout,
				'clear': App.clear,
				'*default': App.index
			}
		});

		$(document).ready(function(){
			App.init();
			var slideout = new Slideout({
			    'panel': document.getElementById('panel'),
			    'menu':  document.getElementById('menu'),
			    'padding': 256,
			    'tolerance': 70
			});
			document.querySelector('.toggle-button').addEventListener('click', function() {
		        slideout.toggle();
		     });
		});

	})(jQuery);