
class DraftSimPackage {
    constructor(set) {
        this.set = set;
    }
    findContense(onehot) {
        outputArray = [];
        for (i = 0; i < onehot.length; i++) {
            if (onehot[i] > 0) {
                outputArray.push(masterHash["index_to_name"][i]);
            }
        }
        return outputArray;
    }
    findSum(onehot) {
        count = 0;
        for (i = 0; i < onehot.length; i++) {
            count += onehot[i]
        }
        return count
    }
}  