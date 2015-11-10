/**********************************

   Models

 **********************************/

var User = Backbone.Model.extend({
	defaults: { 
		name: ""
	}
});


var Routine = Backbone.Model.extend({
	defaults: { 
		name: "",
		description: ""
	}
});


var Exercise = Backbone.Model.extend({
	defaults: { 
		name: "",
		description: "",
		defaultReps: 0
	},
	initialize: function(){
		this.listenTo(Backbone, 'workout:completed', _.bind(this.oncomplete, this));
	},
	oncomplete: function(e) {
		var exercise = e.data.findWhere({"exerciseId": this.get("id")});
		if (exercise) {
			this.save({"weight": exercise.get("weight")});
		}
	}
});


var WorkoutExercise = Backbone.Model.extend({
	defaults: { 
		routineId: null,
		exerciseId: null,
		defaultReps: 0
	}
});


var Workout = Backbone.Model.extend({
	defaults: {
		userId: null,
		routineId: null,
		date: null
	},
	initialize: function(){
		this.listenTo(Backbone, 'workout:completed', _.bind(this.oncomplete, this));
	},
	oncomplete: function(e){
		if (e.workoutId === this.get("id")) {
			this.save({"completed": true});
		}
	}
});


var Set = Backbone.Model.extend({
	defaults: {
		exerciseId: null,
		numberOfReps: 0
	},
	initialize: function(options){
		this.exercises = options.exercises;
		this.listenTo(Backbone, 'workout:completed', _.bind(this.oncomplete, this));
	},
	oncomplete: function(e){
		if (e.workoutId === this.get("workoutId")) {
			var weight = this.exercises.findWhere({"id": this.get("exerciseId")}).get("weight");
			this.save({"completed": true, "weight": weight});
		}
	}
});

var UserSetting = Backbone.Model.extend({
	defaults: {
		units: "kg"
	}
});

/**********************************

   Collections

 **********************************/


var Users = Backbone.Collection.extend({ //People
	model: User,
	localStorage: new Backbone.LocalStorage("users")
});


var Routines = Backbone.Collection.extend({
	model: Routine,
	localStorage: new Backbone.LocalStorage("routine")
});


var Exercises = Backbone.Collection.extend({
	model: Exercise,
	localStorage: new Backbone.LocalStorage("exercises")
});


var WorkoutExercises = Backbone.Collection.extend({ // PeopleRoutines
	model: WorkoutExercise,
	localStorage: new Backbone.LocalStorage("workoutExercises")
});


var Workouts = Backbone.Collection.extend({ // PeopleRoutines
	model: Workout,
	localStorage: new Backbone.LocalStorage("workouts")
});


var Sets = Backbone.Collection.extend({ // PeopleRoutines
	model: Set,
	localStorage: new Backbone.LocalStorage("sets")
});


var UserSettings = Backbone.Collection.extend({
	model: UserSetting,
	localStorage: new Backbone.LocalStorage("settings")
});


/**********************************

   Views

 **********************************/


var SetEditView = Backbone.View.extend({
	className: "reps-input-view sub-view",
	events: {
		"change input": "onchange"
	},
	template: _.template("<div><input type='text' length='3' value='<%= numberOfReps %>' /></div>"),
	render: function() {
		this.$el.append(this.template(this.model.toJSON()));
		return this;
	},
	onchange: function(e) {
		this.model.set("numberOfReps", parseFloat(e.target.value));
	}
});


var WorkoutEditView = Backbone.View.extend({
	className: "workout-input-view sub-view",
	events: {
		"click button": "onclick"
	},
	template: _.template("<label>COMPLETED REPS</label><div class='workout-input'></div><div class='btn-group' role='group'><button id='submit' class='btn btn-primary'>SUBMIT</button>"),
	render: function() {
		this.$el.html(this.template());
		this.model.get("group").forEach(_.bind(this.renderSubView, this));
		return this;
	},
	renderSubView: function(m) {
		this.$(".workout-input").append(new SetEditView({model: m}).render().el);
		return this;
	},
	onclick: function(e) {
		switch(e.target.id) {
			case "submit":
				Backbone.trigger('exercise:completed', this.model);
				break;
		}
	}
});


var WorkoutView = Backbone.View.extend({
	className: "workout-view view",
	current: 0,
	template: _.template("<div><%= label %>: <%= sets %> x <%= defaultReps %></div><div class='orange giant'><%= weight %></div><span><%= units %></span><div class='edit'></div>"),
	completeTemplate: _.template("<div><a href='/#' id='workout-complete' class='btn btn-primary'>COMPLATE</a>"),
	events: {
		"click #workout-complete": "complete"
	},
	initialize: function() {
		this.listenTo(Backbone, 'exercise:completed', this.next);
	},
	render: function(view) {
		var m = this.collection.at(this.current);
		switch (view) {
			case 'workout:complete':
				this.$el.html(this.completeTemplate());
				break;
			default:
				this.$el.html(this.template(m.toJSON()));
				this.$('.edit').html(new WorkoutEditView({model: m}).render().el);
				break;
		}
		return this;
	},
	next: function(){
		if (this.current + 1 < this.collection.length) {
			this.current++;
			this.render();
		} else if (this.current + 1 === this.collection.length) {
			this.render('workout:complete');
		}
	},
	complete: function(){
		Backbone.trigger("workout:completed", {"workoutId": _.uniq(this.collection.pluck("workoutId")).pop(), data: this.collection});
	}
});


var UserSettingView = Backbone.View.extend({
	className: "seetings-view view",
	template: _.template("<div><select name='units'><option value='kgs'>Kgs</option><option value='lbs'>lbs</option></select></div>"),
	events: {
		"change select": "onchange"
	},
	render: function() {
		this.$el.html(this.template());
		return this;
	},
	onchange: function (e) {
		this.collection.at(0).set(e.target.name, e.target.value);
		this.collection.at(0).save();
	}
});


var ExerciseView = Backbone.View.extend({
	className: "exercise-input-view sub-view clear",
	events: {
		"change input": "onchange"
	},
	template: _.template("<div><label><%= label %></label><input type='text' data-field='weight' value='<%= weight %>' /><input type='text' data-field='increment' value='<%= increment %>' /></div>"),
	render: function() {
		this.$el.append(this.template(this.model.toJSON()));
		return this;
	},
	onchange: function(e) {
		this.model.set(e.target.dataset.field, parseInt(e.target.value));
		this.model.save();
	}
});


var ExerciseListView = Backbone.View.extend({
	events: {
		"click button": "onclick"
	},
	template: _.template("<div class='edit view'></div><div><button id='submit' class='btn btn-primary'>SUBMIT</button></div>"),
	render: function() {
		this.$el.html(this.template());
		this.collection.forEach(_.bind(this.add, this))
		return this;
	},
	add: function(m) {
		this.$(".edit").append(new ExerciseView({model: m}).render().el)
	},
	onclick: function(){
		this.collection.forEach(function(m){
			m.save();
		});
	},
	
});


var ChartView = Backbone.View.extend({
		className: "chart-view sub-view clear",
		template: _.template("<h2><%= label %></h2><canvas height='100'></canvas>"),
		initialize: function(options) {
			this.title = options.title;
			this.data  = options.data;
		},
		render: function() {
			this.$el.html(this.template({label: this.title, width: this.getDimensions().w}));
			setTimeout(_.bind(this.chart, this), 0);
			return this;
		},
		chart: function(){
			var ctx = this.$("canvas").get(0).getContext("2d");
			new Chart(ctx).Line(this.data, {bezierCurve: false, pointDotRadius : 2});
		},
		getDimensions: function() {
			var w = $("main").width();
			return { w: w - 20};
		}
});


var ChartListView = Backbone.View.extend({
	className: "chart-list-view view clear",
	initialize: function(options) {
		this.sets = options.sets;
	},
	render: function() {
		this.$el.html("");
		for (var ex in this.sets) {
			this.add(this.sets[ex], ex);
		}
		return this;
	},
	add: function(c, txt) {
		this.$el.append(new ChartView({collection: c, title: txt, data: new ChartPresenter(c)}).render().el);
	}
});


/**********************************

   Helpers

 **********************************/


function format(d) {
	d = new Date(d);
	return d.getDate()+'/'+(parseInt(d.getMonth())+1);
}

var ChartPresenter = function(sets) {
	return { labels: this.labels(sets), datasets: this.datasets(sets) }
}

ChartPresenter.prototype.datasets = function(sets) {
	var	i = 0,
			ret = [],
			temp = {},
			count = _.uniq(sets.pluck("sets")).pop();
	for (i = 0; i < count; i++) {
		// console.log(arguments);
		ret.push(_.extend({data: []}, ChartPresenter.prototype.defaults));
	}
	sets.forEach(function(set) {
		var d = set.get("date");
		if (!temp[d]) temp[d] = [];
		temp[d].push(set.get("weight"));
	});
	for (var key in temp) {
		for (i = 0; i < count; i++) {
			ret[i].data.push(temp[key][i]);
		}
	}
	//// console.log(ret);
	return ret;
}

ChartPresenter.prototype.labels = function(sets) {
	return _.map(_.uniq(sets.pluck("date")), function(d) { 
		return format(d); 
	});
}

ChartPresenter.prototype.defaults = {
  label: "My First dataset",
  fillColor: "rgba(249,147,121,0.5)",
  strokeColor: "rgba(249,78,35,0.8)",
  highlightFill: "rgba(220,220,220,0.75)",
  highlightStroke: "rgba(220,220,220,1)"
}


var HistoryPresenter = function(options) {
	var	presented = {},
			exercises,
			attributes;
	//// // // // // console.log(exercises);
	options.sets.forEach(function(set) {	
		var workout  = options.workouts.findWhere({"id": set.get("workoutId")}),
				exercise = options.exercises.findWhere({"id": set.get("exerciseId")}),
				label		 = exercise.get("label");
		//// console.log(exercise)
		if (!presented[label]) {
				presented[label] = new Backbone.Collection();
		}
		attributes = _.omit(_.extend({date: workout.get("date"), sets: exercise.get("sets")}, set.toJSON()), 'id', 'increment');
		//// // // // // console.log(attributes) ;
		presented[label].add(new Backbone.Model(attributes));
	});
	// // console.log("presented:", presented)
	return presented;
}


var WorkoutPresenter = function(options) {
	var groups = {}, 
		settings = options.settings.toJSON(),
		presented = new Backbone.Collection();
	delete settings.id;
	// group the models together by exercise id;
	options.sets.forEach(function(set) {
		var id = set.get("exerciseId");
		if (!groups[id]) {
			groups[id] = new Backbone.Collection();
		}	
		groups[id].add(set);
	});
	// create a new presenter model for each group;
	for (var id in groups) {
		var attrs,
			model = new Backbone.Model(),
			// clone the first model in the group as a base;
			base = groups[id].at(0).toJSON();
		// clean base;
		delete base.id;
		model.set(base);
		// add exercise routine specific attributes as attributes;
		attrs = _.omit(this.mapAttrsById(model.get("exerciseId"), options).toJSON(), 'id');
		model.set(_.extend(base, attrs, settings, {"group": groups[id]})); 
		// // // // console.log("model:",model.toJSON());
		presented.add(model);
	};
	return presented;
};

WorkoutPresenter.prototype.mapAttrsById = function(id, options) {
	return options.exercises.reduce(function(memo, exercise) {
		if (exercise.get("id") === id) memo = exercise;
		return memo;
	});
}

