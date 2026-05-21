<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use Illuminate\Http\Request;

class BranchController extends Controller
{
    private const ALLOWED_BRANCH_NAMES = ['Luna Branch', 'Roxas Branch'];

    public function index()
    {
        return response()->json(
            Branch::query()
                ->whereIn('name', self::ALLOWED_BRANCH_NAMES)
                ->orderBy('name')
                ->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|in:Luna Branch,Roxas Branch',
            'address' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:30',
            'is_active' => 'required|boolean',
        ]);

        $branch = Branch::create($validated);

        return response()->json($branch, 201);
    }

    public function update(Request $request, Branch $branch)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|in:Luna Branch,Roxas Branch',
            'address' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:30',
            'is_active' => 'sometimes|required|boolean',
        ]);

        $branch->update($validated);

        return response()->json($branch);
    }

    public function destroy(Branch $branch)
    {
        if (in_array($branch->name, self::ALLOWED_BRANCH_NAMES, true)) {
            return response()->json(['message' => 'This branch cannot be deleted.'], 422);
        }

        $branch->delete();

        return response()->json(null, 204);
    }
}
