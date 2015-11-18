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
		this.exercises 	= options.exercises;
		this.listenTo(Backbone, 'workout:completed', _.bind(this.oncomplete, this));
	},
	oncomplete: function(e){
		// console.log(e.get("id") , this.get("workoutId"));
		if (e.get("id") === this.get("workoutId")) {
			var weight = this.exercises.findWhere({"id": this.get("exerciseId")}).get("weight");
			// console.log("Set", weight);
			this.save({"completed": true, "weight": weight, date: e.get("date")});
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

var DatePickerView = Backbone.View.extend({
	className: "date-input-view sub-view",
	events: {
		"click button": "onclick",
		"change input": "onchange"
	},
	date: [],
	template: _.template("<label>Date Completed</label><div class='date-input flex-container'><input data-type='day' type='text' value='<%= day %>'/><input data-type='month' type='text' value='<%= month %>'/><input data-type='year' type='text' value='<%= year %>'/></div><button id='submit' class='btn btn-primary'>UPDATE</button>"),
	render: function() {
		this.$el.html(this.template(this.model.toJSON()));
		return this;
	},
	onclick: function(e) {
		// TODO need to validate date;
		Backbone.trigger("date:changed", this.model);

	},
	onchange: function(e) {
		// console.log(this.createDate());
		this.model.set($(e.target).data('type'), parseInt(e.target.value));
		this.model.set("date", this.createDate());
		this.model.save();
	},
	createDate: function(){
		return new Date([this.model.get("month"),this.model.get("day"),this.model.get("year")].join("/"));
	}
});

var WorkoutCompleteView = Backbone.View.extend({
	template: _.template("<div><a href='/#' id='workout-complete' class='btn btn-primary'>COMPLETED</a>"),
	render: function() {
		this.$el.html(this.template({date: this.date()}));
		return this;
	},
	date: function(){
		return format(new Date(this.model.get("date")), "DD/MM/YYYY");
	}
});


var WorkoutView = Backbone.View.extend({
	className: "workout-view view",
	current: 0,
	template: _.template("<div class='flex-container'><%= label %>: <%= sets %> x <%= defaultReps %><button id='date-requestchange' class='btn btn-primary'><%= date %></button></div><div class='edit-date'></div></div><div class='orange giant'><%= weight %></div><span><%= units %></span><div class='edit'></div>"),
	events: {
		"click #workout-complete": 		"onWorkoutComplete",
		"click #date-requestchange": 	"updateDate"
	},
	initialize: function(options) {
		this.workout = options.workout;
		this.listenTo(Backbone, 'exercise:completed', this.next);
		this.listenTo(Backbone, 'date:changed', _.bind(this.onDateChange, this));

	},
	render: function(subview) {
		var d, exercise = this.collection.at(this.current);
		console.log(exercise);
		switch (subview) {
			case "datepicker" :
				this.$(".edit-date").html(new DatePickerView({model: this.workout}).render().el);
				break;
			case "completed":
				this.$el.html(new WorkoutCompleteView({model: this.workout}).render().el);
				break;
			default:
				this.$el.html(this.template(_.extend(exercise.toJSON(), {date: format(this.workout.get("date"), "DD/MM/YYYY")})));
				this.$('.edit').html(new WorkoutEditView({model: exercise}).render().el);
				break;
		}
		return this;
	},
	next: function(){
		if (this.current + 1 < this.collection.length) {
			this.current++;
			this.render();
		} else if (this.current + 1 === this.collection.length) {
			console.log(this.workout);
			this.render('completed');
		}
	},
	updateDate: function(){
		this.render('datepicker');
	},
	onDateChange: function(e){
		this.render();
	},
	onWorkoutComplete: function(){
		Backbone.trigger("workout:completed", this.workout);
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


var StatsView = Backbone.View.extend({
	className: "flex-container",
	template: _.template("<dl class='workout-stat'><dt class='workout-stat__label'>1RPM</dt><dd class='workout-stat__data'><%= onerepmax %></dd></dl><dl class='workout-stat'><dt class='workout-stat__label'>TOTAL</dt><dd class='workout-stat__data'><%= total %></dd></dl><dl class='workout-stat'><dt class='workout-stat__label'>WEIGHT</dt><dd class='workout-stat__data'><%= current %></dd></dl>"),
	render: function() {
		this.$el.html(this.template(this.model.toJSON()));
		return this;
	}
});


var ChartView = Backbone.View.extend({
		className: "chart-view sub-view clear",
		template: _.template("<h2><%= label %></h2><div class='workout-stats'></div><canvas height='100'></canvas>"),
		initialize: function(options) {
			Chart.defaults.global.scaleShowLabels = false;
			this.title = options.title;
			this.data  = options.data;
		},
		render: function() {
			this.$el.html(this.template({label: this.title, width: this.getDimensions().w}));
			setTimeout(_.bind(this.chart, this), 0);
			var m = new StatsPresenter(this.collection);
			this.$('.workout-stats').html(new StatsView({model: m}).render().el);
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


function format(d, format) {
	d = new Date(d);
	switch(format) {
		case "DD/MM/YYYY" :
			return d.getDate()+'/'+(parseInt(d.getMonth())+1)+'/'+(parseInt(d.getYear()));
		default:
			return d.getDate();
	}
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

var StatsPresenter = function(c) {
	this.collection = c;
	return new Backbone.Model({
		onerepmax: 	this.get1RM(),
		total: 		this.getTotal(),
		current: 	this.getMaxWeight()	
	});
}

StatsPresenter.prototype.getTotal = function() {
	var a = this.collection.pluck("weight");
	return _.reduce(a, function(memo, weight){
		return memo + parseInt(weight);
	});
};

StatsPresenter.prototype.getMaxWeight = function() {
	return Math.max.apply(null, this.collection.pluck("weight"));
}

StatsPresenter.prototype.get1RM = function() {
	var max = this.getMaxWeight(), 
		reps = 5;
	// Epley Formula
	// source: https://en.wikipedia.org/wiki/One-repetition_maximum;
	return Math.floor(max * (1+(reps / 30)));
}

