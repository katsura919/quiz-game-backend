export interface IAdmin{
    email: string;
    password: string;
    name: string;
    createdAt: Date;
}

export interface RegisterBody {
    email: string;
    password: string;
    name: string;
}

export interface LoginBody {
    email: string;
    password: string;
}