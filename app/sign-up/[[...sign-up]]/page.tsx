import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-amber-100 p-6">
            <SignUp />
        </div>
    );
}
