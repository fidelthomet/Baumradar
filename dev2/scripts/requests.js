function getTrees(resolve, reject, params) {

	var url = "http://api.flaneur.io/baumkataster/"

	if (params.location) {
		url += "loc/" + params.location[0] + "/" + params.location[1]
		state.lastRequest = [params.location[0], params.location[1]]
	}

	$.get(url, function(data) {
		var trees = JSON.parse(data)

		if (!state.treeList.length) {
			trees.forEach(function(tree) {
				state.treeList.push(tree.Baumnummer)
			})
			resolve(trees)
		} else {
			var newTrees = []
			trees.forEach(function(tree) {
				if (state.treeList.indexOf(tree.Baumnummer) == -1) {
					state.treeList.push(tree.Baumnummer)
					newTrees.push(tree)
				}
			})
			resolve(newTrees)
		}
	})
}