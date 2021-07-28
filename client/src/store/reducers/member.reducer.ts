import ActionType from '../actions/types';

const MemberReducer = (state = [], action: {type: string, payload?: any}) => {

    switch (action.type){
        case ActionType.GET_MEMBERS:
            return [...state]
        case ActionType.SET_MEMBERS:
            return [...action.payload]

        default: return [...state]
    }
};

export default MemberReducer;